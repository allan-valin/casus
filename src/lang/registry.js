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
import { finnish } from './fi/index.js';
import { modernGreek } from './el/index.js';
import { sanskrit } from './sa/index.js';
import { czech } from './cs/index.js';
import { polish } from './pl/index.js';
import { icelandic } from './is/index.js';
import { turkish } from './tr/index.js';
import { hungarian } from './hu/index.js';
import { portuguese } from './pt/index.js';
import { french } from './fr/index.js';
import { spanish } from './es/index.js';
import { english } from './en/index.js';

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
  { code: 'fi', path: '/fi/', name: { en: 'Finnish', pt: 'Finlandês' } },
  { code: 'el', path: '/el/', name: { en: 'Modern Greek', pt: 'Grego moderno' } },
  { code: 'sa', path: '/sa/', name: { en: 'Sanskrit', pt: 'Sânscrito' } },
  { code: 'cs', path: '/cs/', name: { en: 'Czech', pt: 'Tcheco' } },
  { code: 'pl', path: '/pl/', name: { en: 'Polish', pt: 'Polonês' } },
  { code: 'tr', path: '/tr/', name: { en: 'Turkish', pt: 'Turco' } },
  { code: 'hu', path: '/hu/', name: { en: 'Hungarian', pt: 'Húngaro' } },
  { code: 'is', path: '/is/', name: { en: 'Icelandic', pt: 'Islandês' } },
  { code: 'pt', path: '/pt/', name: { en: 'Portuguese (Brazil)', pt: 'Português (Brasil)' } },
  { code: 'fr', path: '/fr/', name: { en: 'French', pt: 'Francês' } },
  { code: 'es', path: '/es/', name: { en: 'Spanish', pt: 'Espanhol' } },
  { code: 'en', path: '/en/', name: { en: 'English', pt: 'Inglês' } },
];

const DEFINITIONS = { la: latin, grc: greek, de: german, ja: japanese, ar: arabic, ru: russian, ko: korean, zh: chinese, mk: macedonian, fi: finnish, el: modernGreek, sa: sanskrit, cs: czech, pl: polish, is: icelandic, tr: turkish, hu: hungarian, pt: portuguese, fr: french, es: spanish, en: english };

export function getLanguage(code) {
  return DEFINITIONS[code];
}
