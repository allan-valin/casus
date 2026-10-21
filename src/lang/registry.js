import { NAMES } from './names.js';
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
import { italian } from './it/index.js';
import { dutch } from './nl/index.js';
import { ukrainian } from './uk/index.js';
import { lithuanian } from './lt/index.js';
import { hebrew } from './he/index.js';
import { serboCroatian } from './sh/index.js';
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
  { code: 'it', path: '/it/', name: { en: 'Italian', pt: 'Italiano' } },
  { code: 'nl', path: '/nl/', name: { en: 'Dutch', pt: 'Holandês' } },
  { code: 'uk', path: '/uk/', name: { en: 'Ukrainian', pt: 'Ucraniano' } },
  { code: 'lt', path: '/lt/', name: { en: 'Lithuanian', pt: 'Lituano' } },
  { code: 'he', path: '/he/', name: { en: 'Hebrew', pt: 'Hebraico' } },
  { code: 'sh', path: '/sh/', name: { en: 'Serbo-Croatian', pt: 'Servo-croata' } },
  { code: 'en', path: '/en/', name: { en: 'English', pt: 'Inglês' } },
];

const DEFINITIONS = { la: latin, grc: greek, de: german, ja: japanese, ar: arabic, ru: russian, ko: korean, zh: chinese, mk: macedonian, fi: finnish, el: modernGreek, sa: sanskrit, cs: czech, pl: polish, is: icelandic, tr: turkish, hu: hungarian, pt: portuguese, fr: french, es: spanish, it: italian, nl: dutch, uk: ukrainian, lt: lithuanian, he: hebrew, sh: serboCroatian, en: english };

// names in every interface language (src/lang/names.js), filled in where a language has none of its own
for (const l of [...LANGUAGES, ...Object.values(DEFINITIONS)]) if (l?.name && NAMES[l.code]) l.name = { ...NAMES[l.code], ...l.name };
for (const l of Object.values(DEFINITIONS)) if (l?.inText && NAMES[l.code]) l.inText = { ...NAMES[l.code], ...l.inText };

export function getLanguage(code) {
  return DEFINITIONS[code];
}
