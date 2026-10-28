// The Bergamot translation worker (MPL-2.0) is served from our own site: a worker must be same-origin, and it loads
// its WebAssembly next to itself. Run before every build and dev server (package.json pre-scripts); public/bergamot
// is not versioned. Allan, 2026-10-28.
import { cpSync, mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
const root = fileURLToPath(new URL('..', import.meta.url));
mkdirSync(`${root}public/bergamot`, { recursive: true });
cpSync(`${root}node_modules/@browsermt/bergamot-translator/worker`, `${root}public/bergamot`, { recursive: true });
console.log('bergamot worker copied to public/bergamot');
