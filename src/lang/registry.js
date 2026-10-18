/* The shipped languages, in the order the bar lists them. Latin is the landing page. */
import { latin } from './la/index.js';
import { greek } from './grc/index.js';
import { german } from './de/index.js';

export const LANGUAGES = [
  { code: 'la', path: '/', name: { en: 'Latin', pt: 'Latim' } },
  { code: 'grc', path: '/grc/', name: { en: 'Ancient Greek', pt: 'Grego antigo' } },
  { code: 'de', path: '/de/', name: { en: 'German', pt: 'Alemão' } },
];

const DEFINITIONS = { la: latin, grc: greek, de: german };

export function getLanguage(code) {
  return DEFINITIONS[code];
}
