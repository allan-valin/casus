/* The shipped languages, in the order the bar lists them. Latin is the landing page. */
import { latin } from './la/index.js';
import { greek } from './grc/index.js';
import { german } from './de/index.js';
import { japanese } from './ja/index.js';
import { arabic } from './ar/index.js';
import { russian } from './ru/index.js';
import { korean } from './ko/index.js';
import { chinese } from './zh/index.js';
import { macedonian } from './mk/index.js';

export const LANGUAGES = [
  { code: 'la', path: '/', name: { en: 'Latin', pt: 'Latim' } },
  { code: 'grc', path: '/grc/', name: { en: 'Ancient Greek', pt: 'Grego antigo' } },
  { code: 'de', path: '/de/', name: { en: 'German', pt: 'Alemão' } },
  { code: 'ja', path: '/ja/', name: { en: 'Japanese', pt: 'Japonês' } },
  { code: 'ar', path: '/ar/', name: { en: 'Arabic', pt: 'Árabe' } },
  { code: 'ru', path: '/ru/', name: { en: 'Russian', pt: 'Russo' } },
  { code: 'ko', path: '/ko/', name: { en: 'Korean', pt: 'Coreano' } },
  { code: 'zh', path: '/zh/', name: { en: 'Chinese', pt: 'Chinês' } },
  { code: 'mk', path: '/mk/', name: { en: 'Macedonian', pt: 'Macedônio' } },
];

const DEFINITIONS = { la: latin, grc: greek, de: german, ja: japanese, ar: arabic, ru: russian, ko: korean, zh: chinese, mk: macedonian };

export function getLanguage(code) {
  return DEFINITIONS[code];
}
