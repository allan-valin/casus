/* The path selects the language and the view (spec 2026-10-18 §4): `/` is Latin's reader,
 * `/<code>/` another language's reader, `/<code>/game/` its alphabet drill. Unknown → Latin. */
import { LANGUAGES } from '../../lang/registry.js';

export function langFromPath(pathname, base = '/', languages = LANGUAGES) {
  const b = base.endsWith('/') ? base : `${base}/`;
  const rest = pathname.startsWith(b) ? pathname.slice(b.length) : pathname.replace(/^\//, '');
  const [code, view] = rest.split('/').filter(Boolean);
  const known = languages.find((l) => l.code === code && l.path !== '/');
  if (!known) return { code: 'la', view: 'reader' };
  return { code, view: view === 'game' ? 'game' : 'reader' };
}
