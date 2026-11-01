// The plugin's declared program (OAI-1016): the same conversation app as the loopback service in server.mjs, over stdin and
// stdout, as Otoha starts a plugin's local service. It serves the built page only, never Otoha data.
import { readFileSync, realpathSync } from 'node:fs';
import { createInterface } from 'node:readline';
import { fileURLToPath } from 'node:url';
import { answer } from './server.mjs';

const record = (value) => value !== null && typeof value === 'object' && !Array.isArray(value);

/** Answers each JSON-RPC request line of `input` on `output`; notifications and lines that are not requests get no answer. */
export function serveStdio(html, input, output) {
  if (typeof html !== 'string' || Buffer.byteLength(html) > 1_048_576) throw new Error('Invalid app artifact');
  createInterface({ input }).on('line', (line) => {
    let message;
    try { message = JSON.parse(line); } catch { return; }
    if (!record(message) || message.jsonrpc !== '2.0' || typeof message.method !== 'string' || message.id === undefined) return;
    if (!['number', 'string'].includes(typeof message.id)) return;
    const { result, error } = answer(message, html);
    output.write(`${JSON.stringify({ jsonrpc: '2.0', id: message.id, ...(error ? { error } : { result }) })}\n`);
  });
}

// Run as the program, not imported: the same file whichever way the path to it was written.
const started = (() => { try { return realpathSync(process.argv[1] ?? '') === realpathSync(fileURLToPath(import.meta.url)); } catch { return false; } })();
if (started) {
  serveStdio(readFileSync(new URL('./dist/app.html', import.meta.url), 'utf8'), process.stdin, process.stdout);
}
