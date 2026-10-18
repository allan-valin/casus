/* The shipped languages, in the order the bar lists them. Latin is the landing page. */
import { latin } from './la/index.js';

export const LANGUAGES = [
  { code: 'la', path: '/', name: { en: 'Latin', pt: 'Latim' } },
];

const DEFINITIONS = { la: latin };

export function getLanguage(code) {
  return DEFINITIONS[code];
}
