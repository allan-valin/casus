import { defineConfig } from 'vite';
import { svelte } from '@sveltejs/vite-plugin-svelte';
import { existsSync, statSync, createReadStream, cpSync } from 'node:fs';
import { join, resolve, sep } from 'node:path';

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
    },
  };
}

export default defineConfig({
  plugins: [svelte(), serveData()],
  // under vitest, resolve Svelte's browser build so components mount in jsdom
  // (component tests carry `// @vitest-environment jsdom` at the top of the file)
  resolve: process.env.VITEST ? { conditions: ['browser'] } : undefined,
  test: {
    environment: 'node',
  },
});
