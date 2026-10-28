// The Bergamot translation worker (MPL-2.0) is served from our own site: a worker must be same-origin, and it loads
// its WebAssembly next to itself. Run before every build and dev server (package.json pre-scripts); public/bergamot
// is not versioned. Allan, 2026-10-28.
import { cpSync, mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
const root = fileURLToPath(new URL('..', import.meta.url));
mkdirSync(`${root}public/bergamot`, { recursive: true });
cpSync(`${root}node_modules/@browsermt/bergamot-translator/worker`, `${root}public/bergamot`, { recursive: true });
// the library builds its worker with new URL('./worker/translator-worker.js', import.meta.url), ignoring workerUrl; the
// build puts that worker in assets/, and it loads its engine from its own folder → the engine must be there too
// (live 2026-10-28: both 404, and the button waited forever)
mkdirSync(`${root}public/assets`, { recursive: true });
for (const f of ['bergamot-translator-worker.js', 'bergamot-translator-worker.wasm']) cpSync(`${root}node_modules/@browsermt/bergamot-translator/worker/${f}`, `${root}public/assets/${f}`);
console.log('bergamot worker copied to public/bergamot and its engine to public/assets');
