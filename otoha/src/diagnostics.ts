// Otoha's schema-1 statistics adapter. No DeepSeek logs, prompt text, or token heuristics.
export const STATISTICS_URI = 'otoha-context://current/snapshot';
export interface Figure { part: string; basis: string; tokens: number | null; }
export interface RequestRow { sequence: number; requestID: string; model: string; sections: Figure[]; estimate: number | null; window: number | null; reserved: number | null; }
export interface DiagnosticView {
  conversationID: string; epoch: number; sequence: number; requests: RequestRow[];
  knownEstimate: number | null; completeEstimate: boolean;
  input: number | null; output: number | null; total: number | null;
  cacheRead: number | null; cacheWrite: number | null; cost: number | null;
  compactions: { turn: number; before: number | null; after: number | null; summary: string }[];
}
const object = (value: unknown): Record<string, unknown> => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('Invalid statistics');
  return value as Record<string, unknown>;
};
const count = (value: unknown): number | null => Number.isSafeInteger(value) && Number(value) >= 0 ? Number(value) : null;
const text = (value: unknown): string => {
  if (typeof value !== 'string' || value.length > 1024) throw new Error('Invalid statistics label');
  return value;
};
const rows = (value: unknown): Record<string, unknown>[] => {
  if (!Array.isArray(value) || value.length > 64) throw new Error('Invalid statistics history');
  return value.map(object);
};
const baseParts = ['instructions', 'tools', 'user', 'assistant', 'toolResult'];
const sum = (values: (number | null)[]): number | null => {
  if (!values.length || values.includes(null)) return null;
  const result = values.reduce<number>((total, value) => total + (value ?? 0), 0);
  return Number.isSafeInteger(result) ? result : null;
};

export function projectDiagnostics(value: unknown): DiagnosticView {
  const raw = object(value), scope = object(raw.scope), cursor = object(raw.cursor);
  if (raw.schemaVersion !== 1 || scope.accountID !== 'this-mac' || count(cursor.epoch) === null || count(cursor.sequence) === null) throw new Error('Unsupported statistics');
  const requests = rows(raw.requests).map((row): RequestRow => {
    if (!Array.isArray(row.sections) || row.sections.length > 16 || count(row.sequence) === null) throw new Error('Invalid request');
    const sections = row.sections.map((sectionValue): Figure => {
      const item = object(sectionValue), figure = object(item.figure);
      return { part: text(item.part), basis: text(figure.basis), tokens: count(figure.tokens) };
    });
    if (new Set(sections.map((section) => section.part)).size !== sections.length) throw new Error('Duplicate section');
    const estimates = sections.filter((section) => baseParts.includes(section.part) && section.basis === 'estimated' && section.tokens !== null);
    return { sequence: Number(row.sequence), requestID: text(row.requestID), model: text(row.modelName), sections,
      estimate: sum(estimates.map((section) => section.tokens)), window: count(row.contextWindow), reserved: count(row.reservedOutput) };
  }).sort((a, b) => a.sequence - b.sequence);
  const latest = requests.at(-1);
  const known = latest?.sections.filter((part) => baseParts.includes(part.part) && part.basis === 'estimated' && part.tokens !== null) ?? [];
  const facts = new Map<string, Record<string, unknown>>();
  for (const row of rows(raw.usage)) {
    const key = text(row.factID);
    if (!facts.has(key)) facts.set(key, row);
  }
  const usage = Array.from(facts.values());
  const input = sum(usage.map((row) => count(row.reportedInput)));
  const output = sum(usage.map((row) => count(row.reportedOutput)));
  const costs = usage.map((row) => row.costBasis === 'measured' && typeof row.cost === 'number' && Number.isFinite(row.cost) && row.cost >= 0 ? row.cost : null);
  const cost = costs.length && !costs.includes(null) ? costs.reduce<number>((total, amount) => total + (amount ?? 0), 0) : null;
  return { conversationID: text(scope.conversationID), epoch: Number(cursor.epoch), sequence: Number(cursor.sequence), requests,
    knownEstimate: known.length ? sum(known.map((part) => part.tokens)) : null,
    completeEstimate: known.length === baseParts.length && !latest?.sections.some((part) => ['reasoning', 'nativeContext'].includes(part.part) && part.basis === 'invisible'),
    input, output, total: input !== null && output !== null ? sum([input, output]) : null,
    cacheRead: sum(usage.map((row) => count(row.cacheRead))), cacheWrite: sum(usage.map((row) => count(row.cacheWrite))), cost,
    compactions: rows(raw.compactions).map((row) => ({ turn: count(row.turn) ?? 0, before: count(row.beforeTokens), after: count(row.afterTokens), summary: text(row.summary) })) };
}

export function decodeResource(value: unknown): DiagnosticView {
  const result = object(value);
  if (!Array.isArray(result.contents) || result.contents.length !== 1) throw new Error('Missing statistics resource');
  const resource = object(result.contents[0]);
  if (resource.uri !== STATISTICS_URI || resource.mimeType !== 'application/json' || typeof resource.text !== 'string' || resource.text.length > 1_048_576) throw new Error('Invalid statistics resource');
  return projectDiagnostics(JSON.parse(resource.text));
}
