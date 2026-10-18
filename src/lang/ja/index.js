/* Japanese (docs/languages/ja.md; overnight plan 2026-10-19). */
import { segment } from './segment.js';
import { tokenize, splitWords } from './tokenize.js';
import { JAPANESE_INVENTORY } from './inventory.js';
import { kanaStage, particleStage, adverbStage, readingStage } from './stages.js';
import { bucket } from './bucket.js';
import { kanaToRomaji } from './romanize.js';
import { ROWS, LETTERS, LABELS, createGame, createGrid } from './game.js';

export const japanese = {
  code: 'ja',
  name: { en: 'Japanese', pt: 'Japonês' },
  inText: { en: 'Japanese', pt: 'japonês' },
  bcp47: 'ja',
  wiktionary: 'Japanese',
  sources: { en: 'Wiktionary', pt: 'Wikcionário', full: { en: 'the English Wiktionary', pt: 'o Wiktionary em inglês' } },
  // shards are named by a hash of the first two characters (tools/casus_build/ja/bucket.py); kana in drills and
  // lists romanise directly, kanji words get their romaji from the reading the dictionary gives (readingStage)
  script: { normalize: (s) => s.normalize('NFC'), rtl: false, spaced: false, prefixOf: bucket, romanize: (t) => kanaToRomaji(t), fontScale: 1.15 },
  inventory: JAPANESE_INVENTORY,
  segment,
  tokenize,
  splitWords,
  stages: [kanaStage, particleStage, adverbStage, readingStage],
  government: {},
  arrange: [],
  eras: [{ id: 'modern', label: 'Present-day standard Japanese', authors: '', ages: [], ipa: [] }],
  dataPath: '/data/ja',
  samplesPath: '/samples/ja',
  voice: { espeak: 'ja', natural: null },
  // the voice reads kana (espeak-ng cannot read kanji); the reading is in the dictionary form: 食べる (たべる)
  speakForm: (r) => r.dict_form?.match(/\(([^)]+)\)$/)?.[1] ?? r.headword,
  game: { ROWS, LETTERS, LABELS, createGame, createGrid },
  drillNames: { letters: { en: 'Kana', pt: 'Kana' }, nouns: { en: 'Adjective forms', pt: 'Formas dos adjetivos' }, verbs: { en: 'Verb forms', pt: 'Formas verbais' }, words: { en: 'JLPT words', pt: 'Palavras do JLPT' } },
};
