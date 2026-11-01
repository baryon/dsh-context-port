// A standalone loopback MCP service for the port. It serves UI bytes only, never Otoha data.
import { createServer } from 'node:http';
import { randomUUID } from 'node:crypto';
export const CONTEXT_RESOURCE = 'ui://dsh-context/app.html';
export const contextTool = { name: 'context-dashboard', title: '上下文', description: 'Opens the read-only context dashboard for this conversation.',
  inputSchema: { type: 'object', properties: {}, additionalProperties: false },
  annotations: { readOnlyHint: true, destructiveHint: false, openWorldHint: false },
  _meta: { ui: { resourceUri: CONTEXT_RESOURCE, visibility: [] }, 'openai/ui': { entrypoints: [{ type: 'thread' }] } } };
const record = (value) => value !== null && typeof value === 'object' && !Array.isArray(value);
/** The answer to one request, the same over the loopback service and over stdio (stdio.mjs). */
export function answer(message, html) {
  const params = record(message.params) ? message.params : {};
  let result, error;
  switch (message.method) {
    case 'initialize': result = { protocolVersion: params.protocolVersion ?? '2025-06-18', capabilities: { tools: {}, resources: {} }, serverInfo: { name: 'dsh-context Otoha port', version: '0.1.0' } }; break;
    case 'ping': result = {}; break;
    case 'tools/list': result = { tools: [contextTool] }; break;
    case 'tools/call':
      if (params.name !== contextTool.name || !record(params.arguments) || Object.keys(params.arguments).length) error = { code: -32602, message: 'The dashboard takes no arguments' };
      else result = { content: [] };
      break;
    case 'resources/list': result = { resources: [{ uri: CONTEXT_RESOURCE, name: 'Context dashboard', mimeType: 'text/html;profile=mcp-app' }] }; break;
    case 'resources/templates/list': result = { resourceTemplates: [] }; break;
    case 'resources/read':
      if (params.uri !== CONTEXT_RESOURCE) error = { code: -32602, message: 'Unknown resource' };
      else result = { contents: [{ uri: CONTEXT_RESOURCE, mimeType: 'text/html;profile=mcp-app', text: html }] };
      break;
    default: error = { code: -32601, message: 'Unsupported method' };
  }
  return { result, error };
}

export async function startContextServer(html) {
  if (typeof html !== 'string' || Buffer.byteLength(html) > 1_048_576) throw new Error('Invalid app artifact');
  const route = `/mcp/${randomUUID()}`;
  let host;
  const server = createServer({ requestTimeout: 5000, headersTimeout: 5000 }, (request, response) => {
    if (request.headers.host !== host || request.headers.origin !== undefined) { response.writeHead(403).end(); return; }
    if (request.url !== route) { response.writeHead(404).end(); return; }
    if (request.method !== 'POST') { response.writeHead(405).end(); return; }
    if (request.headers['content-type']?.split(';')[0] !== 'application/json') { response.writeHead(415).end(); return; }
    const chunks = []; let size = 0;
    request.on('data', (chunk) => { size += chunk.length; if (size > 32768) { response.writeHead(413).end(); request.destroy(); } else chunks.push(chunk); });
    request.on('error', () => response.destroy());
    request.on('end', () => {
      if (response.writableEnded) return;
      let message;
      try { message = JSON.parse(Buffer.concat(chunks).toString('utf8')); } catch { response.writeHead(400).end(); return; }
      if (!record(message) || message.jsonrpc !== '2.0' || typeof message.method !== 'string') { response.writeHead(400).end(); return; }
      if (message.id === undefined) { response.writeHead(202).end(); return; }
      if (!['number', 'string'].includes(typeof message.id)) { response.writeHead(400).end(); return; }
      const { result, error } = answer(message, html);
      response.writeHead(200, { 'content-type': 'application/json', 'cache-control': 'no-store' });
      response.end(JSON.stringify({ jsonrpc: '2.0', id: message.id, ...(error ? { error } : { result }) }));
    });
  });
  server.maxConnections = 16;
  await new Promise((resolve, reject) => { server.once('error', reject); server.listen(0, '127.0.0.1', resolve); });
  host = `127.0.0.1:${server.address().port}`;
  let closing;
  return { address: `http://${host}${route}`, close: () => closing ??= new Promise((resolve) => { server.close(resolve); server.closeAllConnections(); }) };
}
