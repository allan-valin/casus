/* Russian (docs/languages/ru.md; overnight plan 2026-10-19). Stress supplied from the dictionary, like Greek accents. */
import { governmentStage, agreementStage } from '../../lib/disambiguate.js';
import { prepositionSettledStage, makeCoordinationStage, makeNumberStage, casedStage, makeOneSubjectStage } from '../../lib/classical.js';
import { WORD_ORDERS } from '../../app/lib/order.js';
import { segment } from './segment.js';
import { tokenize } from './tokenize.js';
import { GOVERNMENT } from './prepositions.js';
import { RUSSIAN_INVENTORY } from './inventory.js';
import { stripRu, hasMarksRu } from './normalize.js';
import { romanizeRu } from './romanize.js';
import { ROWS, LETTERS, createGame, createGrid } from './game.js';

const gov = (blocks) => governmentStage(blocks, GOVERNMENT);
const agr = (blocks) => agreementStage(blocks, RUSSIAN_INVENTORY);
const AND = ['и', 'или', 'да'];

export const russian = {
  code: 'ru',
  name: { en: 'Russian', pt: 'Russo' },
  inText: { en: 'Russian', pt: 'russo' },
  bcp47: 'ru',
  wiktionary: 'Russian',
  sources: { en: 'Wiktionary', pt: 'Wikcionário', full: { en: 'the English Wiktionary', pt: 'o Wiktionary em inglês' } },
  script: { normalize: (s) => s.normalize('NFC'), rtl: false, spaced: true, prefixOf: stripRu, strip: stripRu, hasMarks: hasMarksRu, romanize: romanizeRu },
  inventory: RUSSIAN_INVENTORY,
  segment,
  tokenize,
  stages: [casedStage, gov, agr, gov, prepositionSettledStage, makeCoordinationStage(AND), makeNumberStage({ conjunctions: AND }),
    makeOneSubjectStage({ conjunctions: AND, copulas: ['есть', 'был', 'была', 'было', 'были', 'будет', 'будут', 'является', 'являются', 'стал', 'стала', 'стало', 'стали'] }), gov, agr, gov],
  government: GOVERNMENT,
  arrange: WORD_ORDERS,
  eras: [{ id: 'modern', label: 'Present-day standard Russian', authors: '', ages: [], ipa: [] }],
  dataPath: '/data/ru',
  samplesPath: '/samples/ru',
  voice: { espeak: 'ru', natural: { voiceId: 'ru_RU-irina-medium', name: 'Irina', sizeMB: 63 } },
  game: { ROWS, LETTERS, createGame, createGrid },
};
