/* Arabic (docs/languages/ar.md; overnight plan 2026-10-19). Right to left; vowels supplied from the dictionary. */
import { governmentStage } from '../../lib/disambiguate.js';
import { segment } from './segment.js';
import { tokenize, splitWords } from './tokenize.js';
import { GOVERNMENT } from './prepositions.js';
import { ARABIC_INVENTORY } from './inventory.js';
import { stripAr, hasMarksAr, keepsAr } from './normalize.js';
import { romanizeAr } from './romanize.js';
import { ipaAr } from './ipa.js';
import { ROWS, LETTERS, LABELS, createGame, createGrid } from './game.js';
import { prepStage, vsoStage, adjectiveStage, vowelStage, idafaStage } from './clause.js';

const gov = (blocks) => governmentStage(blocks, GOVERNMENT);

export const arabic = {
  code: 'ar',
  name: { en: 'Arabic', pt: 'Árabe' },
  inText: { en: 'Arabic', pt: 'árabe' },
  bcp47: 'ar',
  wiktionary: 'Arabic',
  sources: { en: 'Wiktionary', pt: 'Wikcionário', full: { en: 'the English Wiktionary', pt: 'o Wiktionary em inglês' } },
  script: { normalize: (s) => s.normalize('NFC'), rtl: true, spaced: true, prefixOf: stripAr, strip: stripAr, hasMarks: hasMarksAr, keeps: keepsAr, romanize: romanizeAr, ruleIpa: ipaAr, fontScale: 1.45, lemmaOnTop: true },
  inventory: ARABIC_INVENTORY,
  segment,
  tokenize,
  splitWords,
  // agreement is the adjective's with the noun before it (adjectiveStage), not sentence-wide
  stages: [vowelStage, idafaStage, gov, prepStage, idafaStage, vsoStage, adjectiveStage, gov, prepStage, idafaStage, adjectiveStage],
  government: GOVERNMENT,
  arrange: [],
  eras: [{ id: 'msa', label: 'Modern Standard Arabic', authors: '', ages: [], ipa: [] }],
  dataPath: '/data/ar',
  samplesPath: '/samples/ar',
  // Piper ar_JO-kareem: its dataset states no licence; Allan 2026-10-28: a natural voice is required — use it until
  // someone objects. One male speaker; women's voices are pitched up in Conversation.
  // phonemes 'espeak': our engine, so pitch changes keep the tempo; speed < 1 = a bit quicker (Allan: "speaks too slowly")
  voice: { espeak: 'ar', natural: { voiceId: 'ar_JO-kareem-medium', name: 'Kareem', sizeMB: 63, phonemes: 'espeak', speed: 0.88 } },
  game: { ROWS, LETTERS, LABELS, createGame, createGrid },
};
