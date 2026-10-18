import { defineConfig } from 'vite';
import { svelte } from '@sveltejs/vite-plugin-svelte';
import { existsSync, statSync, createReadStream, cpSync } from 'node:fs';
import { join, resolve, sep } from 'node:path';
import { mkdirSync, copyFileSync } from 'node:fs';
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
      if (existsSync(DATA)) cpSync(DATA, resolve('dist/data'), { recursive: true });
      // one HTML per language route, so a deep link (/grc/, /grc/game/) loads on static hosting
      const html = resolve('dist/index.html');
      if (!existsSync(html)) return;
      for (const l of LANGUAGES) {
        const at = l.path.replace(/\/$/, '');
        // the reader (Latin's is the root itself), the drills, and the old /game/ links
        for (const dir of [...(l.path === '/' ? [] : [l.path]), `${at}/drills/`, ...(l.path === '/' ? [] : [`${at}/game/`])]) {
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
  resolve: process.env.VITEST ? { conditions: ['browser'] } : undefined,
  test: {
    environment: 'node',
  },
});
