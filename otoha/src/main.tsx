import { createRoot } from 'react-dom/client';
import { App } from '@modelcontextprotocol/ext-apps';
import { ContextView } from './contextView.tsx';
import { DiagnosticsFeed, type FeedState } from './feed.ts';
import { STATISTICS_URI } from './diagnostics.ts';

const root = createRoot(document.getElementById('root')!);
const app = new App({ name: 'dsh-context Otoha port', version: '0.1.0' });
let state: FeedState = { status: 'loading', data: null };
const feed = new DiagnosticsFeed((signal) => app.readServerResource({ uri: STATISTICS_URI }, { signal }), (next) => { state = next; render(); });
function render() { root.render(<ContextView data={state.data} status={state.status === 'stopped' ? 'loading' : state.status} refresh={() => { void feed.refresh(); }} />); }
render();
void app.connect().then(() => feed.refresh()).catch(() => { state = { status: 'failed', data: null }; render(); });
// A full snapshot is bounded to 64 events and its cursor is checked by the feed.
// No model/tool call or provider connection is started by opening the panel.
const poll = setInterval(() => { if (!document.hidden && state.status === 'ready') void feed.refresh(); }, 2000);
document.addEventListener('visibilitychange', () => { if (document.hidden) feed.pause(); else void feed.refresh(); });
window.addEventListener('pagehide', () => { clearInterval(poll); feed.dispose(); void app.close(); }, { once: true });
