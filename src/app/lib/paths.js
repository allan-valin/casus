/**
 * Prefixes an absolute site path with the base the bundle is served under.
 * Vite sets `import.meta.env.BASE_URL` from `base` in vite.config.js: '/' in dev and
 * for a root deployment, '/casus/' on the GitHub Pages project site.
 */
export function withBase(path, base = import.meta.env?.BASE_URL ?? '/') {
  const b = base.endsWith('/') ? base.slice(0, -1) : base;
  return b + (path.startsWith('/') ? path : '/' + path);
}
