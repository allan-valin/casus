/* Colour identity (Allan, 2026-10-20): light or dark, and a palette per language taken from its flag — or each of its
 * flags when several countries speak it (Portuguese: Brazil and Portugal) — with the original Casus purple always on
 * offer. The page's other colours are mixed from these in app.css. Flags: flag-icons (MIT). */

// flag-icons code → the flag's colours, most prominent first (Allan, 2026-10-27: "use flag logic" — Switzerland is
// mostly red, Austria has more white, Germany shows red and gold), an optional accent where the first strong colour
// would repeat a sibling flag of the same language, and the name shown in the menu
const FLAG = {
  casus: { colors: ['#6b4e9b', '#c9a227'], name: { en: 'Casus purple', pt: 'Roxo Casus' } },
  spqr: { colors: ['#8e1414', '#d4a72c'], name: { en: 'Rome (SPQR)', pt: 'Roma (SPQR)' } },
  athens: { colors: ['#4f5d2a', '#b59a3b'], name: { en: 'Athens (owl)', pt: 'Atenas (coruja)' } },
  sparta: { colors: ['#9b1b1b', '#d4a72c'], name: { en: 'Sparta (Λ)', pt: 'Esparta (Λ)' } },
  va: { colors: ['#ffe000', '#ffffff', '#b8860b'], name: { en: 'Vatican', pt: 'Vaticano' } },
  it: { colors: ['#008c45', '#ffffff', '#cd212a'], name: { en: 'Italy', pt: 'Itália' } },
  gr: { colors: ['#0d5eaf', '#ffffff'], name: { en: 'Greece', pt: 'Grécia' } },
  cy: { colors: ['#ffffff', '#d57800', '#4e5b31'], name: { en: 'Cyprus', pt: 'Chipre' } },
  de: { colors: ['#ffce00', '#dd0000', '#000000'], name: { en: 'Germany', pt: 'Alemanha' } },
  at: { colors: ['#ffffff', '#c8102e'], name: { en: 'Austria', pt: 'Áustria' } },
  ch: { colors: ['#d52b1e', '#ffffff'], name: { en: 'Switzerland', pt: 'Suíça' } },
  jp: { colors: ['#ffffff', '#bc002d'], name: { en: 'Japan', pt: 'Japão' } },
  arab: { colors: ['#006c35', '#ffffff'], name: { en: 'Arab League', pt: 'Liga Árabe' } },
  eg: { colors: ['#ffffff', '#ce1126', '#000000', '#c09300'], name: { en: 'Egypt', pt: 'Egito' } },
  ma: { colors: ['#c1272d', '#006233'], name: { en: 'Morocco', pt: 'Marrocos' } },
  ru: { colors: ['#ffffff', '#0039a6', '#d52b1e'], name: { en: 'Russia', pt: 'Rússia' } },
  kr: { colors: ['#ffffff', '#003478', '#c60c30'], name: { en: 'South Korea', pt: 'Coreia do Sul' } },
  cn: { colors: ['#de2910', '#ffde00'], name: { en: 'China', pt: 'China' } },
  tw: { colors: ['#fe0000', '#000095', '#ffffff'], accent: '#000095', name: { en: 'Taiwan', pt: 'Taiwan' } },
  mk: { colors: ['#d20000', '#ffe600'], name: { en: 'North Macedonia', pt: 'Macedônia do Norte' } },
  fi: { colors: ['#ffffff', '#003580'], name: { en: 'Finland', pt: 'Finlândia' } },
  in: { colors: ['#ffffff', '#ff9933', '#138808', '#000080'], name: { en: 'India', pt: 'Índia' } },
  np: { colors: ['#dc143c', '#003893'], name: { en: 'Nepal', pt: 'Nepal' } },
  cz: { colors: ['#ffffff', '#d7141a', '#11457e'], name: { en: 'Czechia', pt: 'Tchéquia' } },
  pl: { colors: ['#ffffff', '#dc143c'], name: { en: 'Poland', pt: 'Polônia' } },
  tr: { colors: ['#e30a17', '#ffffff'], name: { en: 'Turkey', pt: 'Turquia' } },
  hu: { colors: ['#ce2939', '#ffffff', '#477050'], name: { en: 'Hungary', pt: 'Hungria' } },
  is: { colors: ['#02529c', '#ffffff', '#dc1e35'], name: { en: 'Iceland', pt: 'Islândia' } },
  br: { colors: ['#009c3b', '#ffdf00', '#002776'], name: { en: 'Brazil', pt: 'Brasil' } },
  pt: { colors: ['#da291c', '#046a38', '#ffcc00'], name: { en: 'Portugal', pt: 'Portugal' } },
  ao: { colors: ['#000000', '#cc092f', '#ffcb00'], name: { en: 'Angola', pt: 'Angola' } },
  mz: { colors: ['#fce100', '#007168', '#d21034', '#000000'], name: { en: 'Mozambique', pt: 'Moçambique' } },
  gb: { colors: ['#012169', '#c8102e', '#ffffff'], accent: '#c8102e', name: { en: 'United Kingdom', pt: 'Reino Unido' } },
  us: { colors: ['#ffffff', '#b31942', '#0a3161'], name: { en: 'United States', pt: 'Estados Unidos' } },
  au: { colors: ['#012169', '#e4002b', '#ffffff'], name: { en: 'Australia', pt: 'Austrália' } },
  es: { colors: ['#f1bf00', '#aa151b'], name: { en: 'Spain', pt: 'Espanha' } },
  mx: { colors: ['#ffffff', '#006847', '#ce1126'], name: { en: 'Mexico', pt: 'México' } },
  ar: { colors: ['#74acdf', '#ffffff', '#f6b40e'], name: { en: 'Argentina', pt: 'Argentina' } },
  co: { colors: ['#fcd116', '#003893', '#ce1126'], name: { en: 'Colombia', pt: 'Colômbia' } },
  fr: { colors: ['#ffffff', '#0055a4', '#ef4135'], name: { en: 'France', pt: 'França' } },
  be: { colors: ['#fdda24', '#000000', '#ef3340'], name: { en: 'Belgium', pt: 'Bélgica' } },
  nl: { colors: ['#ffffff', '#ae1c28', '#21468b'], name: { en: 'Netherlands', pt: 'Países Baixos' } },
  sr: { colors: ['#377e3f', '#ffffff', '#b40a2d'], name: { en: 'Suriname', pt: 'Suriname' } },
  ua: { colors: ['#0057b7', '#ffd700'], name: { en: 'Ukraine', pt: 'Ucrânia' } },
  lt: { colors: ['#fdb913', '#006a44', '#c1272d'], name: { en: 'Lithuania', pt: 'Lituânia' } },
  hr: { colors: ['#ffffff', '#ff0000', '#171796'], name: { en: 'Croatia', pt: 'Croácia' } },
  rs: { colors: ['#0c4076', '#c6363c', '#ffffff'], name: { en: 'Serbia', pt: 'Sérvia' } },
  ba: { colors: ['#002395', '#fecb00', '#ffffff'], accent: '#fecb00', name: { en: 'Bosnia and Herzegovina', pt: 'Bósnia e Herzegovina' } },
  me: { colors: ['#c40308', '#d4af3a'], name: { en: 'Montenegro', pt: 'Montenegro' } },
  ro: { colors: ['#fcd116', '#002b7f', '#ce1126'], name: { en: 'Romania', pt: 'Romênia' } },
  md: { colors: ['#0046ae', '#ffd200', '#cc092f'], name: { en: 'Moldova', pt: 'Moldávia' } },
  se: { colors: ['#006aa7', '#fecc00'], name: { en: 'Sweden', pt: 'Suécia' } },
  bd: { colors: ['#006a4e', '#f42a41'], name: { en: 'Bangladesh', pt: 'Bangladesh' } },
  id: { colors: ['#ce1126', '#ffffff'], name: { en: 'Indonesia', pt: 'Indonésia' } },
  vn: { colors: ['#da251d', '#ffcd00'], name: { en: 'Vietnam', pt: 'Vietnã' } },
  ir: { colors: ['#ffffff', '#239f40', '#da0000'], name: { en: 'Iran', pt: 'Irã' } },
  af: { colors: ['#000000', '#d32011', '#007a36'], name: { en: 'Afghanistan', pt: 'Afeganistão' } },
  ph: { colors: ['#0038a8', '#ce1126', '#ffffff', '#fcd116'], name: { en: 'Philippines', pt: 'Filipinas' } },
  tz: { colors: ['#1eb53a', '#00a3dd', '#000000', '#fcd116'], name: { en: 'Tanzania', pt: 'Tanzânia' } },
  ke: { colors: ['#000000', '#bb0000', '#006600', '#ffffff'], name: { en: 'Kenya', pt: 'Quênia' } },
  tj: { colors: ['#ffffff', '#cc0000', '#006600'], name: { en: 'Tajikistan', pt: 'Tajiquistão' } },
  sm: { colors: ['#ffffff', '#5eb6e4'], name: { en: 'San Marino', pt: 'San Marino' } },
  ca: { colors: ['#ffffff', '#d80621'], name: { en: 'Canada (Québec)', pt: 'Canadá (Quebec)' } },
};

// language → its flags, most representative first
export const LANGUAGE_FLAGS = {
  la: ['spqr', 'va'], grc: ['athens', 'sparta', 'gr'], el: ['gr', 'cy'], de: ['de', 'at', 'ch'], ja: ['jp'], ar: ['arab', 'eg', 'ma'], ru: ['ru'],
  ko: ['kr'], zh: ['cn', 'tw'], mk: ['mk'], fi: ['fi'], sa: ['in', 'np'], cs: ['cz'], pl: ['pl'], tr: ['tr'], hu: ['hu'],
  is: ['is'], pt: ['br', 'pt', 'ao', 'mz'], en: ['gb', 'us', 'au'], es: ['es', 'mx', 'ar', 'co'], fr: ['fr', 'be', 'ca', 'ch'], it: ['it', 'ch', 'sm'], nl: ['nl', 'be', 'sr'], uk: ['ua'], lt: ['lt'], sh: ['hr', 'rs', 'ba', 'me'], ro: ['ro', 'md'], sv: ['se', 'fi'], hi: ['in'], bn: ['bd', 'in'], id: ['id'], vi: ['vn'], fa: ['ir', 'af', 'tj'], sw: ['tz', 'ke'], tl: ['ph'],
};

export const MODE_KEY = 'casus:mode';
export const themeKey = (code) => `casus:theme:${code}`;

// relative luminance (WCAG) and contrast
function lum(hex) {
  const [r, g, b] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255).map((c) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}
const contrast = (a, b) => { const [x, y] = [lum(a), lum(b)].sort((m, n) => n - m); return (x + 0.05) / (y + 0.05); };
const chromatic = (hex) => { const v = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16)); return Math.max(...v) - Math.min(...v) > 40; };
const hex2 = (n) => Math.round(n).toString(16).padStart(2, '0');
// a flag colour made dark enough to read as text on white (contrast 4.5): flag shades are often too bright
function readable(hex) {
  let c = hex;
  for (let k = 0; k < 40 && contrast(c, '#ffffff') < 4.5; k += 1) c = `#${[1, 3, 5].map((i) => hex2(parseInt(c.slice(i, i + 2), 16) * 0.93)).join('')}`;
  return c;
}

/** a flag's dress: the most prominent colour tints the page (white: a white page, coloured text, outlined buttons);
 * the accent is that colour when it is strong, else the next strong one; the second colour is the next after that */
export function dress(f) {
  const [ground] = f.colors;
  const bright = lum(ground) > 0.4;
  const strong = f.colors.filter((c) => chromatic(c) || lum(c) < 0.02);
  const accent = f.accent ?? (!bright && chromatic(ground) ? ground : strong.find((c) => c !== ground && lum(c) <= 0.4) ?? strong[0] ?? ground);
  const second = f.colors.find((c) => c !== accent && c !== '#ffffff') ?? accent;
  const white = ground === '#ffffff';
  return {
    accent: readable(accent), accent2: second, groundOf: ground,
    groundAmt: white ? '0%' : bright ? '16%' : '8%',
    fill: white ? 'outline' : 'solid',
  };
}

/** the palettes a language offers: its flags, then the Casus purple */
export function themesFor(code) {
  return [...(LANGUAGE_FLAGS[code] ?? []), 'casus'].map((id) => ({ id, flag: id === 'casus' ? null : id, name: FLAG[id].name, ...dress(FLAG[id]) }));
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

/** the theme's colours as CSS variables; the button style goes on <html data-fill> (app.css) */
export function themeVars(theme) {
  return { '--accent': theme.accent, '--accent-2': theme.accent2, '--accent-ink': inkOn(theme.accent),
    '--ground': theme.groundOf, '--ground-amt': theme.groundAmt };
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
  root.dataset.fill = theme.fill ?? 'solid';
  for (const [k, v] of Object.entries(themeVars(theme))) root.style.setProperty(k, v);
}

// flag images, bundled (only these): Vite turns each into a URL
const FLAG_FILES = import.meta.glob('/node_modules/flag-icons/flags/4x3/{casus,va,it,gr,cy,de,at,ch,jp,arab,eg,ma,ru,kr,cn,tw,mk,fi,in,np,cz,pl,tr,hu,is,br,pt,ao,mz,gb,us,au,es,mx,ar,co,fr,be,ca,nl,sr,ua,sm,lt,hr,rs,ba,me,ro,md,se,bd,id,vn,ir,af,tj,tz,ke,ph}.svg', { eager: true, query: '?url', import: 'default' });
// historical flags flag-icons lacks (Rome, Athens, Sparta), drawn for Casus
const OWN_FLAGS = import.meta.glob('/src/app/flags/*.svg', { eager: true, query: '?url', import: 'default' });
export const flagUrl = (id) => (id ? FLAG_FILES[`/node_modules/flag-icons/flags/4x3/${id}.svg`] ?? OWN_FLAGS[`/src/app/flags/${id}.svg`] ?? null : null);
export const languageFlag = (code) => flagUrl(LANGUAGE_FLAGS[code]?.[0]);
