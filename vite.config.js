import { defineConfig } from 'vite';
import { SITE, siteUrl } from './src/sites.js';
import { svelte } from '@sveltejs/vite-plugin-svelte';
import { existsSync, statSync, createReadStream, cpSync } from 'node:fs';
import { join, resolve, sep } from 'node:path';
import { mkdirSync, copyFileSync, writeFileSync, readFileSync } from 'node:fs';
import { buildSearchIndex } from './src/lib/learn/search.js';
import { LANGUAGES } from './src/lang/registry.js';

/** Learn's word index for one language folder (learn.json + learn/<id>.json) */
function learnSearchOf(dir) {
  const read = (p) => { try { return JSON.parse(readFileSync(p, 'utf8')); } catch { return null; } };
  return buildSearchIndex(read(join(dir, 'learn.json')), (id) => read(join(dir, 'learn', `${id}.json`)));
}

const DATA = resolve('data');

/* The natural voices' engine files, served by our own site (Allan, 2026-10-21: no CDN that can change under us). The
 * packages are pinned at exact versions in package.json; src/app/lib/voice.js points the voices at <base>engine/. */
const ENGINE_FILES = {
  // onnxruntime itself, as its own file: its worker (env.wasm.proxy) starts from the file it was loaded from, which inside
  // our bundle would be the whole app ("document is not defined"); the build leaves the import pointing here
  'ort.wasm.min.mjs': 'node_modules/onnxruntime-web/dist/ort.wasm.min.mjs',
  'ort-wasm-simd-threaded.mjs': 'node_modules/onnxruntime-web/dist/ort-wasm-simd-threaded.mjs',
  'ort-wasm-simd-threaded.wasm': 'node_modules/onnxruntime-web/dist/ort-wasm-simd-threaded.wasm',
  'piper_phonemize.wasm': 'node_modules/@diffusionstudio/piper-wasm/build/piper_phonemize.wasm',
  'piper_phonemize.data': 'node_modules/@diffusionstudio/piper-wasm/build/piper_phonemize.data',
};
const ENGINE_TYPES = { '.mjs': 'text/javascript', '.wasm': 'application/wasm', '.data': 'application/octet-stream' };
function serveEngine() {
  return {
    name: 'casus-voice-engine',
    configureServer(server) {
      server.middlewares.use('/engine', (req, res, next) => {
        const name = decodeURIComponent(req.url.split('?')[0]).replace(/^\//, '');
        const file = ENGINE_FILES[name];
        if (!file || !existsSync(file)) return next();
        res.setHeader('Content-Type', ENGINE_TYPES[name.slice(name.lastIndexOf('.'))] ?? 'application/octet-stream');
        createReadStream(file).on('error', () => next()).pipe(res);
      });
    },
    closeBundle() {
      mkdirSync(resolve('dist/engine'), { recursive: true });
      for (const [name, file] of Object.entries(ENGINE_FILES)) copyFileSync(resolve(file), resolve('dist/engine', name));
    },
  };
}

/** Serves the gitignored data/ at /data in dev; copies it next to the bundle on build. */
function serveData() {
  return {
    name: 'casus-serve-data',
    configureServer(server) {
      server.middlewares.use('/data', (req, res, next) => {
        const file = join(DATA, decodeURIComponent(req.url.split('?')[0]));
        // the dev server builds Learn's word index on request (the build writes it into dist/)
        const m = /^[/]([a-z-]+)[/]learn-search\.json$/.exec(req.url.split('?')[0]);
        if (m && existsSync(join(DATA, m[1], 'learn.json'))) {
          res.setHeader('Content-Type', 'application/json');
          return res.end(JSON.stringify(learnSearchOf(join(DATA, m[1]))));
        }
        if (!file.startsWith(DATA + sep) || !existsSync(file) || !statSync(file).isFile()) return next();
        res.setHeader('Content-Type', 'application/json');
        createReadStream(file).on('error', () => next()).pipe(res);
      });
    },
    closeBundle() {
      // only this site's dictionaries (each site has its own 1 GB on GitHub Pages)
      if (existsSync(DATA)) for (const code of SITE.languages) if (existsSync(join(DATA, code))) cpSync(join(DATA, code), resolve('dist/data', code), { recursive: true });
      // Learn's word index, built from the lessons this build ships (src/lib/learn/search.js; Allan, 2026-10-27)
      for (const code of SITE.languages) {
        const out = resolve('dist/data', code, 'learn-search.json');
        if (existsSync(resolve('dist/data', code, 'learn.json'))) writeFileSync(out, JSON.stringify(learnSearchOf(resolve('dist/data', code))));
      }
      // one HTML per language route, so a deep link (/grc/, /grc/game/) loads on static hosting
      const html = resolve('dist/index.html');
      if (!existsSync(html)) return;
      // a language that moved to another site: its old addresses redirect there
      for (const l of LANGUAGES.filter((x) => !SITE.languages.includes(x.code) && x.path !== '/')) {
        for (const view of ['reader', 'drills', 'proof', 'learn', 'speak', 'talk', 'game']) {
          const out = resolve('dist' + l.path + (view === 'reader' ? '' : `${view}/`));
          mkdirSync(out, { recursive: true });
          const to = siteUrl(l.code, view === 'game' ? 'drills' : view);
          writeFileSync(join(out, 'index.html'), `<!doctype html><meta charset="utf-8"><title>${l.name.en}</title><meta http-equiv="refresh" content="0; url=${to}"><link rel="canonical" href="${to}"><a href="${to}">${to}</a>\n`);
        }
      }
      for (const l of LANGUAGES.filter((x) => SITE.languages.includes(x.code))) {
        const at = l.path.replace(/\/$/, '');
        // the reader (Latin's is the root itself), the drills, and the old /game/ links
        for (const dir of [...(l.path === '/' ? [] : [l.path]), `${at}/drills/`, `${at}/proof/`, `${at}/learn/`, `${at}/speak/`, `${at}/talk/`, ...(l.path === '/' ? [] : [`${at}/game/`])]) {
          const out = resolve('dist' + dir);
          mkdirSync(out, { recursive: true });
          copyFileSync(html, join(out, 'index.html'));
        }
      }
    },
  };
}

export default defineConfig({
  // '/' in dev and for a root deployment; the Pages workflow sets CASUS_BASE=/casus/
  base: process.env.CASUS_BASE || '/',
  plugins: [svelte(), serveData(), serveEngine()],
  // under vitest, resolve Svelte's browser build so components mount in jsdom
  // (component tests carry `// @vitest-environment jsdom` at the top of the file)
  // hunspell-asm's ESM build imports its wasm runtime as a namespace, not a function; its CommonJS build (with the
  // package's browser field) converts cleanly (proofreading, 2026-10-19)
  resolve: process.env.VITEST ? { conditions: ['browser'] } : { alias: [{ find: /^hunspell-asm$/, replacement: 'hunspell-asm/dist/cjs/index.js' }] },
  optimizeDeps: { include: ['hunspell-asm/dist/cjs/index.js'] },
  // onnxruntime stays out of the bundle and is loaded from <base>engine/ (see ENGINE_FILES)
  build: { rollupOptions: { external: ['onnxruntime-web/wasm'], output: { paths: { 'onnxruntime-web/wasm': `${process.env.CASUS_BASE || '/'}engine/ort.wasm.min.mjs` } } } },
  test: {
    environment: 'node',
  },
});
