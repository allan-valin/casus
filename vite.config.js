import { defineConfig } from 'vite';
import { SITE, siteUrl } from './src/sites.js';
import { svelte } from '@sveltejs/vite-plugin-svelte';
import { existsSync, statSync, createReadStream, cpSync } from 'node:fs';
import { join, resolve, sep } from 'node:path';
import { mkdirSync, copyFileSync, writeFileSync } from 'node:fs';
import { LANGUAGES } from './src/lang/registry.js';

const DATA = resolve('data');

/** Serves the gitignored data/ at /data in dev; copies it next to the bundle on build. */
function serveData() {
  return {
    name: 'casus-serve-data',
    configureServer(server) {
      server.middlewares.use('/data', (req, res, next) => {
        const file = join(DATA, decodeURIComponent(req.url.split('?')[0]));
        if (!file.startsWith(DATA + sep) || !existsSync(file) || !statSync(file).isFile()) return next();
        res.setHeader('Content-Type', 'application/json');
        createReadStream(file).on('error', () => next()).pipe(res);
      });
    },
    closeBundle() {
      // only this site's dictionaries (each site has its own 1 GB on GitHub Pages)
      if (existsSync(DATA)) for (const code of SITE.languages) if (existsSync(join(DATA, code))) cpSync(join(DATA, code), resolve('dist/data', code), { recursive: true });
      // one HTML per language route, so a deep link (/grc/, /grc/game/) loads on static hosting
      const html = resolve('dist/index.html');
      if (!existsSync(html)) return;
      // a language that moved to another site: its old addresses redirect there
      for (const l of LANGUAGES.filter((x) => !SITE.languages.includes(x.code) && x.path !== '/')) {
        for (const view of ['reader', 'drills', 'proof', 'learn', 'speak', 'game']) {
          const out = resolve('dist' + l.path + (view === 'reader' ? '' : `${view}/`));
          mkdirSync(out, { recursive: true });
          const to = siteUrl(l.code, view === 'game' ? 'drills' : view);
          writeFileSync(join(out, 'index.html'), `<!doctype html><meta charset="utf-8"><title>${l.name.en}</title><meta http-equiv="refresh" content="0; url=${to}"><link rel="canonical" href="${to}"><a href="${to}">${to}</a>\n`);
        }
      }
      for (const l of LANGUAGES.filter((x) => SITE.languages.includes(x.code))) {
        const at = l.path.replace(/\/$/, '');
        // the reader (Latin's is the root itself), the drills, and the old /game/ links
        for (const dir of [...(l.path === '/' ? [] : [l.path]), `${at}/drills/`, `${at}/proof/`, `${at}/learn/`, `${at}/speak/`, ...(l.path === '/' ? [] : [`${at}/game/`])]) {
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
  plugins: [svelte(), serveData()],
  // under vitest, resolve Svelte's browser build so components mount in jsdom
  // (component tests carry `// @vitest-environment jsdom` at the top of the file)
  // hunspell-asm's ESM build imports its wasm runtime as a namespace, not a function; its CommonJS build (with the
  // package's browser field) converts cleanly (proofreading, 2026-10-19)
  resolve: process.env.VITEST ? { conditions: ['browser'] } : { alias: [{ find: /^hunspell-asm$/, replacement: 'hunspell-asm/dist/cjs/index.js' }] },
  optimizeDeps: { include: ['hunspell-asm/dist/cjs/index.js'] },
  test: {
    environment: 'node',
  },
});
