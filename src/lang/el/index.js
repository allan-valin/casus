/* Modern Greek (docs/languages/el.md; overnight 2026-10-19): four cases, accents supplied from the dictionary like
 * Ancient Greek's, Latin letters in the modern pronunciation. */
import { makeCaseLanguage } from '../caseLanguage.js';
import { stripEl, hasMarksEl, romanizeEl } from './script.js';
import { ROWS, LETTERS, createGame, createGrid } from './game.js';
import CODES from './codes.js';
import { splitWords } from './split.js';

const C = (id, badge, en, pt) => ({ id, badge, en, pt });
// prepositions take the accusative (σε, από, με, για, προς, χωρίς, μετά, κατά…), keyed without accents like the tokens
const ACC = ['σε', 'σ', 'απο', 'με', 'για', 'προσ', 'χωρισ', 'μετα', 'κατα', 'παρα', 'ωσ', 'μεχρι', 'αντι', 'δια', 'υπερ'];
export const modernGreek = makeCaseLanguage({
  code: 'el',
  name: { en: 'Modern Greek', pt: 'Grego moderno' },
  inText: { en: 'Modern Greek', pt: 'grego moderno' },
  bcp47: 'el',
  wiktionary: 'Greek',
  cases: [C('nom', 'Nm', 'nominative', 'nominativo'), C('gen', 'Gn', 'genitive', 'genitivo'), C('acc', 'Ac', 'accusative', 'acusativo'), C('voc', 'Vc', 'vocative', 'vocativo')],
  hues: ['nom', 'gen', 'acc', 'voc'],
  government: Object.fromEntries(ACC.map((p) => [p, ['acc']])),
  and: ['και', 'ή', 'κι'],
  copulas: ['είναι', 'ειναι', 'είμαι', 'ήταν'],
  pronounPerson: { εγώ: '1', εσύ: '2', αυτός: '3', αυτή: '3', αυτό: '3', εμείς: '1', εσείς: '2', αυτοί: '3', αυτές: '3', αυτά: '3' },
  codes: CODES,
  voice: { espeak: 'el', natural: { voiceId: 'el_GR-rapunzelina-low', name: 'Rapunzelina', sizeMB: 28 } },
  script: { prefixOf: stripEl, strip: stripEl, hasMarks: hasMarksEl, romanize: romanizeEl },
  game: { ROWS, LETTERS, createGame, createGrid },
  splitWords,
  address: ['ω', 'ε', 'βρε', 'ρε'],
});
