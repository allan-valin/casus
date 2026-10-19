/* Colour identity (Allan, 2026-10-20): light or dark, and a palette per language taken from its flag — or each of its
 * flags when several countries speak it (Portuguese: Brazil and Portugal) — with the original Casus purple always on
 * offer. The page's other colours are mixed from these in app.css. Flags: flag-icons (MIT). */

// flag-icons code → accent (the flag's strongest colour, dark enough for white text unless `ink` says otherwise),
// second colour, and the name shown in the menu
const FLAG = {
  casus: { accent: '#6b4e9b', accent2: '#c9a227', name: { en: 'Casus purple', pt: 'Roxo Casus' } },
  va: { accent: '#9c7a00', accent2: '#ffe000', name: { en: 'Vatican', pt: 'Vaticano' } },
  it: { accent: '#008c45', accent2: '#cd212a', name: { en: 'Italy (Rome)', pt: 'Itália (Roma)' } },
  gr: { accent: '#0d5eaf', accent2: '#7fb2e5', name: { en: 'Greece', pt: 'Grécia' } },
  cy: { accent: '#b45f06', accent2: '#4e5b31', name: { en: 'Cyprus', pt: 'Chipre' } },
  de: { accent: '#c00000', accent2: '#ffce00', name: { en: 'Germany', pt: 'Alemanha' } },
  at: { accent: '#c8102e', accent2: '#8a8a8a', name: { en: 'Austria', pt: 'Áustria' } },
  ch: { accent: '#d52b1e', accent2: '#8a8a8a', name: { en: 'Switzerland', pt: 'Suíça' } },
  jp: { accent: '#bc002d', accent2: '#333333', name: { en: 'Japan', pt: 'Japão' } },
  arab: { accent: '#006c35', accent2: '#c9a227', name: { en: 'Arab League', pt: 'Liga Árabe' } },
  eg: { accent: '#ce1126', accent2: '#c09300', name: { en: 'Egypt', pt: 'Egito' } },
  ma: { accent: '#c1272d', accent2: '#006233', name: { en: 'Morocco', pt: 'Marrocos' } },
  ru: { accent: '#0039a6', accent2: '#d52b1e', name: { en: 'Russia', pt: 'Rússia' } },
  kr: { accent: '#003478', accent2: '#c60c30', name: { en: 'South Korea', pt: 'Coreia do Sul' } },
  cn: { accent: '#de2910', accent2: '#ffde00', name: { en: 'China', pt: 'China' } },
  tw: { accent: '#000095', accent2: '#fe0000', name: { en: 'Taiwan', pt: 'Taiwan' } },
  mk: { accent: '#d20000', accent2: '#ffe600', name: { en: 'North Macedonia', pt: 'Macedônia do Norte' } },
  fi: { accent: '#003580', accent2: '#7aa6d6', name: { en: 'Finland', pt: 'Finlândia' } },
  in: { accent: '#c56a00', accent2: '#138808', name: { en: 'India', pt: 'Índia' } },
  np: { accent: '#dc143c', accent2: '#003893', name: { en: 'Nepal', pt: 'Nepal' } },
  cz: { accent: '#11457e', accent2: '#d7141a', name: { en: 'Czechia', pt: 'Tchéquia' } },
  pl: { accent: '#dc143c', accent2: '#8a8a8a', name: { en: 'Poland', pt: 'Polônia' } },
  tr: { accent: '#e30a17', accent2: '#8a8a8a', name: { en: 'Turkey', pt: 'Turquia' } },
  hu: { accent: '#ce2939', accent2: '#477050', name: { en: 'Hungary', pt: 'Hungria' } },
  is: { accent: '#02529c', accent2: '#dc1e35', name: { en: 'Iceland', pt: 'Islândia' } },
  br: { accent: '#009c3b', accent2: '#ffdf00', name: { en: 'Brazil', pt: 'Brasil' } },
  pt: { accent: '#046a38', accent2: '#da291c', name: { en: 'Portugal', pt: 'Portugal' } },
  ao: { accent: '#cc092f', accent2: '#ffcb00', name: { en: 'Angola', pt: 'Angola' } },
  mz: { accent: '#007168', accent2: '#fce100', name: { en: 'Mozambique', pt: 'Moçambique' } },
  gb: { accent: '#012169', accent2: '#c8102e', name: { en: 'United Kingdom', pt: 'Reino Unido' } },
  us: { accent: '#0a3161', accent2: '#b31942', name: { en: 'United States', pt: 'Estados Unidos' } },
  au: { accent: '#012169', accent2: '#e4002b', name: { en: 'Australia', pt: 'Austrália' } },
  es: { accent: '#aa151b', accent2: '#f1bf00', name: { en: 'Spain', pt: 'Espanha' } },
  mx: { accent: '#006847', accent2: '#ce1126', name: { en: 'Mexico', pt: 'México' } },
  ar: { accent: '#2f6faa', accent2: '#f6b40e', name: { en: 'Argentina', pt: 'Argentina' } },
  co: { accent: '#003893', accent2: '#fcd116', name: { en: 'Colombia', pt: 'Colômbia' } },
  fr: { accent: '#0055a4', accent2: '#ef4135', name: { en: 'France', pt: 'França' } },
  be: { accent: '#c8102e', accent2: '#fdda24', name: { en: 'Belgium', pt: 'Bélgica' } },
  ca: { accent: '#d80621', accent2: '#8a8a8a', name: { en: 'Canada (Québec)', pt: 'Canadá (Quebec)' } },
};

// language → its flags, most representative first
export const LANGUAGE_FLAGS = {
  la: ['it', 'va'], grc: ['gr'], el: ['gr', 'cy'], de: ['de', 'at', 'ch'], ja: ['jp'], ar: ['arab', 'eg', 'ma'], ru: ['ru'],
  ko: ['kr'], zh: ['cn', 'tw'], mk: ['mk'], fi: ['fi'], sa: ['in', 'np'], cs: ['cz'], pl: ['pl'], tr: ['tr'], hu: ['hu'],
  is: ['is'], pt: ['br', 'pt', 'ao', 'mz'], en: ['gb', 'us', 'au'], es: ['es', 'mx', 'ar', 'co'], fr: ['fr', 'be', 'ca', 'ch'],
};

export const MODE_KEY = 'casus:mode';
export const themeKey = (code) => `casus:theme:${code}`;

/** the palettes a language offers: its flags, then the Casus purple */
export function themesFor(code) {
  return [...(LANGUAGE_FLAGS[code] ?? []), 'casus'].map((id) => ({ id, flag: id === 'casus' ? null : id, ...FLAG[id] }));
}

/** the language's chosen palette (kept per language in this browser), else its first flag */
export function pickTheme(code, storage) {
  const all = themesFor(code);
  let id = null;
  try { id = storage?.getItem(themeKey(code)); } catch { /* none */ }
  return all.find((x) => x.id === id) ?? all[0];
}

// white or near-black text on a colour, whichever reads better (WCAG relative luminance)
function inkOn(hex) {
  const [r, g, b] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255).map((c) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4));
  const lum = 0.2126 * r + 0.7152 * g + 0.0722 * b;
  return (1.05 / (lum + 0.05)) >= ((lum + 0.05) / 0.05) ? '#ffffff' : '#1d1d1b';
}

export function themeVars(theme) {
  return { '--accent': theme.accent, '--accent-2': theme.accent2, '--accent-ink': inkOn(theme.accent) };
}

/** the mode kept in this browser, else the system's */
export function pickMode(storage) {
  try { const m = storage?.getItem(MODE_KEY); if (m === 'dark' || m === 'light') return m; } catch { /* none */ }
  try { return window.matchMedia?.('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'; } catch { return 'light'; }
}

/** put a mode and a palette on the page */
export function applyTheme(mode, theme, root = typeof document !== 'undefined' ? document.documentElement : null) {
  if (!root) return;
  root.dataset.mode = mode;
  for (const [k, v] of Object.entries(themeVars(theme))) root.style.setProperty(k, v);
}

// flag images, bundled (only these): Vite turns each into a URL
const FLAG_FILES = import.meta.glob('/node_modules/flag-icons/flags/4x3/{casus,va,it,gr,cy,de,at,ch,jp,arab,eg,ma,ru,kr,cn,tw,mk,fi,in,np,cz,pl,tr,hu,is,br,pt,ao,mz,gb,us,au,es,mx,ar,co,fr,be,ca}.svg', { eager: true, query: '?url', import: 'default' });
export const flagUrl = (id) => (id ? FLAG_FILES[`/node_modules/flag-icons/flags/4x3/${id}.svg`] ?? null : null);
export const languageFlag = (code) => flagUrl(LANGUAGE_FLAGS[code]?.[0]);
