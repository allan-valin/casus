/* Three sites from one codebase (Allan, 2026-10-19; docs/superpowers/specs/2026-10-19-learn-and-three-sites-design.md):
 * Casus keeps the case languages, Casus Asia has Japanese, Korean and Chinese, Casus World the rest. The build setting
 * VITE_CASUS_SITE picks the site; the language bar, the drills and the downloads show only its languages. */
import { LANGUAGES } from './lang/registry.js';

const ORIGIN = 'https://allan-valin.github.io';
export const SITES = {
  casus: { id: 'casus', title: 'Casus', base: '/casus/', languages: ['la', 'grc', 'de', 'ar', 'ru', 'fi', 'el', 'sa', 'cs', 'pl', 'tr', 'hu', 'is', 'uk', 'lt', 'sh', 'ro'] },
  asia: { id: 'asia', title: 'Casus Asia', base: '/casus-asia/', languages: ['ja', 'ko', 'zh'] },
  world: { id: 'world', title: 'Casus World', base: '/casus-world/', languages: ['pt', 'mk', 'fr', 'en', 'es', 'it', 'nl', 'he', 'sv'] },
};

const chosen = (typeof import.meta !== 'undefined' && import.meta.env?.VITE_CASUS_SITE)
  || (typeof process !== 'undefined' && process.env?.VITE_CASUS_SITE) || 'casus';
export const SITE = SITES[chosen] ?? SITES.casus;

export const siteOf = (code) => Object.values(SITES).find((s) => s.languages.includes(code)) ?? SITES.casus;
/** a site's languages in its own order (the first is the root page) */
export const siteLanguages = (site = SITE) => site.languages.map((c) => LANGUAGES.find((l) => l.code === c)).filter(Boolean);

/** the full address of a language's page on its own site */
export function siteUrl(code, view = 'reader') {
  const site = siteOf(code);
  const l = LANGUAGES.find((x) => x.code === code);
  const path = l?.path === '/' && site.id === 'casus' ? '/' : `/${code}/`;
  const tail = view === 'reader' ? '' : `${view}/`;
  return `${ORIGIN}${site.base.replace(/\/$/, '')}${path}${tail}`;
}
