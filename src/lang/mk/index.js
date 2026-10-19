/* Macedonian (docs/languages/mk.md; overnight plan 2026-10-19). */
import { segment } from '../ru/segment.js';
import { tokenize } from '../ru/tokenize.js';
import { MACEDONIAN_INVENTORY } from './inventory.js';
import { romanizeMk } from './romanize.js';
import { ROWS, LETTERS, createGame, createGrid } from './game.js';
import { letterStage } from './stages.js';
import { WORD_ORDERS } from '../../app/lib/order.js';

export const macedonian = {
  code: 'mk',
  name: { en: 'Macedonian', pt: 'Macedônio' },
  inText: { en: 'Macedonian', pt: 'macedônio' },
  bcp47: 'mk',
  wiktionary: 'Macedonian',
  sources: { en: 'Wiktionary', pt: 'Wikcionário', full: { en: 'the English Wiktionary', pt: 'o Wiktionary em inglês' } },
  script: { normalize: (s) => s.normalize('NFC'), rtl: false, spaced: true, prefixOf: (f) => f.toLowerCase(), romanize: romanizeMk },
  inventory: MACEDONIAN_INVENTORY,
  segment,
  tokenize,
  stages: [letterStage],
  government: {},
  arrange: WORD_ORDERS,
  eras: [{ id: 'modern', label: 'Standard Macedonian', authors: '', ages: [], ipa: [] }],
  dataPath: '/data/mk',
  samplesPath: '/samples/mk',
  voice: { espeak: 'mk', natural: null },
  game: { ROWS, LETTERS, createGame, createGrid },
};
