/* The path selects the language and the view (spec 2026-10-18 §4): `/` is Latin's reader,
 * `/<code>/` another language's reader, `/<code>/drills/` its drills (`/drills/` for Latin). The old
 * `/<code>/game/` links land on the drills page. Unknown → Latin. */
import { siteLanguages } from '../../sites.js';

const DRILLS = new Set(['drills', 'game']);

const VIEWS = new Set(['proof', 'learn']);
export function langFromPath(pathname, base = '/', languages = siteLanguages()) {
  const first = languages[0]?.code ?? 'la';
  const b = base.endsWith('/') ? base : `${base}/`;
  const rest = pathname.startsWith(b) ? pathname.slice(b.length) : pathname.replace(/^\//, '');
  const [code, view] = rest.split('/').filter(Boolean);
  if (DRILLS.has(code)) return { code: first, view: 'drills' };
  if (VIEWS.has(code)) return { code: first, view: code };
  const known = languages.find((l) => l.code === code && l.path !== '/');
  if (!known) return { code: first, view: 'reader' };
  return { code, view: DRILLS.has(view) ? 'drills' : VIEWS.has(view) ? view : 'reader' };
}

/** the drills page of a language, without the site base */
export function drillsPath(language) {
  return `${language.path.replace(/\/$/, '')}/drills/`;
}

/** the proofreading page of a language, without the site base */
export function proofPath(language) {
  return `${language.path.replace(/\/$/, '')}/proof/`;
}

/** the learning page of a language, without the site base */
export function learnPath(language) {
  return `${language.path.replace(/\/$/, '')}/learn/`;
}
