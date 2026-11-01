// Build only: no server or lifecycle hooks. Uses this checkout's pinned build dependencies.
import { build } from 'vite';
import { createRequire } from 'node:module';
import { readFile, mkdir, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
const root = fileURLToPath(new URL('.', import.meta.url));
const desktop = createRequire(new URL('../../Desktop/package.json', import.meta.url));
const output = await build({ root, configFile: false, define: { 'process.env.NODE_ENV': '"production"' }, resolve: { alias: { '@modelcontextprotocol/ext-apps': desktop.resolve('@modelcontextprotocol/ext-apps') } },
  build: { write: false, target: 'chrome140', lib: { entry: `${root}src/main.tsx`, formats: ['iife'], name: 'DshContext' }, minify: true } });
const bundles = Array.isArray(output) ? output : [output];
const chunks = bundles.flatMap((bundle) => bundle.output).filter((item) => item.type === 'chunk');
if (chunks.length !== 1) throw new Error('The isolated app must be self-contained');
const css = await readFile(`${root}src/style.css`, 'utf8') + '\n' + await readFile(`${root}src/vendor/stackedBar.css`, 'utf8');
const html = `<!doctype html><html lang="zh-CN"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>上下文</title><style>${css}</style><div id="root"></div><script>${chunks[0].code.replaceAll('</script', '<\\/script')}</script></html>`;
if (Buffer.byteLength(html) > 1_048_576) throw new Error('The app exceeds the host HTML limit');
await mkdir(`${root}dist`, { recursive: true });
await writeFile(`${root}dist/app.html`, html);
const packages = new Map();
for (const id of Object.keys(chunks[0].modules)) {
  if (!id.includes('node_modules') || id.startsWith('\0')) continue;
  let folder = path.dirname(id.split('?')[0]);
  while (folder !== path.dirname(folder)) {
    let pkg;
    try { pkg = JSON.parse(await readFile(path.join(folder, 'package.json'), 'utf8')); } catch { /* Look above dist subpackages. */ }
    if (pkg?.name) {
      const key = `${pkg.name}@${pkg.version}`;
      if (!packages.has(key)) {
        let license;
        for (const name of ['LICENSE', 'LICENSE.md', 'LICENSE.txt', 'license', 'license.md']) {
          try { license = await readFile(path.join(folder, name), 'utf8'); break; } catch { /* Alternate upstream spelling. */ }
        }
        if (!license) throw new Error(`Missing bundled license for ${key}`);
        packages.set(key, license);
      }
      break;
    }
    folder = path.dirname(folder);
  }
}
await writeFile(`${root}dist/THIRD_PARTY_NOTICES.txt`, [...packages].sort(([a], [b]) => a.localeCompare(b)).map(([name, license]) => `${name}\n${'='.repeat(name.length)}\n${license}`).join('\n\n'));
console.log(`Built isolated dsh-context app: ${Buffer.byteLength(html)} bytes`);
