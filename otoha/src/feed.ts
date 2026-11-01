import { decodeResource, type DiagnosticView } from './diagnostics.ts';
export interface FeedState { status: 'loading' | 'ready' | 'failed' | 'stopped'; data: DiagnosticView | null; }
/** Full bounded snapshots replace state. Closing/losing a connection never leaves old statistics on screen. */
export class DiagnosticsFeed {
  private stopped = false;
  private pending?: AbortController;
  private owner?: string;
  private last?: DiagnosticView;
  private cursor?: { epoch: number; sequence: number };
  private readonly read: (signal: AbortSignal) => Promise<unknown>;
  private readonly publish: (state: FeedState) => void;
  constructor(read: (signal: AbortSignal) => Promise<unknown>, publish: (state: FeedState) => void) { this.read = read; this.publish = publish; }
  async refresh(): Promise<void> {
    if (this.stopped || this.pending) return;
    const controller = new AbortController();
    this.pending = controller;
    if (!this.last) this.publish({ status: 'loading', data: null });
    try {
      const data = decodeResource(await this.read(controller.signal));
      if (this.stopped || controller.signal.aborted) return;
      if (this.owner !== undefined && data.conversationID !== this.owner) throw new Error('Conversation changed');
      if (this.cursor && (data.epoch < this.cursor.epoch || (data.epoch === this.cursor.epoch && data.sequence < this.cursor.sequence))) throw new Error('Stale snapshot');
      this.owner = data.conversationID;
      this.cursor = { epoch: data.epoch, sequence: data.sequence };
      this.last = data;
      this.publish({ status: 'ready', data });
    } catch {
      if (this.stopped || controller.signal.aborted) return;
      this.last = undefined;
      this.publish({ status: 'failed', data: null });
    } finally { if (this.pending === controller) this.pending = undefined; }
  }
  pause(): void {
    this.pending?.abort(); this.pending = undefined; this.last = undefined;
    if (!this.stopped) this.publish({ status: 'stopped', data: null });
  }
  dispose(): void { this.stopped = true; this.pause(); this.publish({ status: 'stopped', data: null }); }
}
