import { properNameStage } from '../../lib/classical.js';
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
  script: { normalize: (s) => s.normalize('NFC').replace(/(?<=\p{Script=Cyrillic})j|j(?=\p{Script=Cyrillic})/gu, 'ј'), rtl: false, spaced: true, prefixOf: (f) => f.toLowerCase(), romanize: romanizeMk },
  inventory: MACEDONIAN_INVENTORY,
  segment,
  tokenize,
  stages: [properNameStage, letterStage],
  government: {},
  arrange: WORD_ORDERS,
  eras: [{ id: 'modern', label: 'Standard Macedonian', authors: '', ages: [], ipa: [] }],
  dataPath: '/data/mk',
  samplesPath: '/samples/mk',
  // no Macedonian voice exists: the Bulgarian Piper voice (CC0) reads Macedonian sounds (src/lang/mk/phonemes.js;
  // Allan chose it by ear, 2026-10-21)
  voice: { espeak: 'mk', natural: { voiceId: 'bg_BG-dimitar-medium', name: 'Dimitar (Bulgarian voice reading Macedonian)', sizeMB: 63, phonemes: 'mk' } },
  game: { ROWS, LETTERS, createGame, createGrid },
};
