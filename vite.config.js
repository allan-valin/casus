import { defineConfig } from 'vite';
import { svelte } from '@sveltejs/vite-plugin-svelte';
import { existsSync, createReadStream, cpSync } from 'node:fs';
import { join, resolve } from 'node:path';

const DATA = resolve('data');

/** Serves the gitignored data/ at /data in dev; copies it next to the bundle on build. */
function serveData() {
  return {
    name: 'casus-serve-data',
    configureServer(server) {
      server.middlewares.use('/data', (req, res, next) => {
        const file = join(DATA, decodeURIComponent(req.url.split('?')[0]));
        if (!file.startsWith(DATA) || !existsSync(file)) return next();
        res.setHeader('Content-Type', 'application/json');
        createReadStream(file).pipe(res);
      });
    },
    closeBundle() {
      if (existsSync(DATA)) cpSync(DATA, resolve('dist/data'), { recursive: true });
    },
  };
}

export default defineConfig({
  plugins: [svelte(), serveData()],
  test: {
    environment: 'node',
    environmentMatchGlobs: [['tests/components/**', 'jsdom']],
  },
});
