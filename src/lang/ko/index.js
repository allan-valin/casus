/* Korean (docs/languages/ko.md; overnight plan 2026-10-19). */
import { segment } from '../ar/segment.js';
import { tokenize, splitWords } from './tokenize.js';
import { particleStage, finalVerbStage, adverbStage, sentenceTypeStage } from './stages.js';
import { romanizeKo } from './romanize.js';
import { bucket } from '../ja/bucket.js';
import { ROWS, LETTERS, LABELS, createGame, createGrid } from './game.js';
import { JAPANESE_INVENTORY } from '../ja/inventory.js';
import CODES from './codes.js';
import { koreanParadigm } from './paradigm.js';

function layoutPairs(json) {
  const LAYOUT = {};
  for (const [pos, names] of Object.entries(json.LAYOUT)) LAYOUT[pos] = names.map((n) => [n, json.TABLES[n]]);
  return { POS: json.POS, LAYOUT, json };
}
// the particle roles and their hues are those of Japanese; the badge of a verb is its speech level and tense
const KOREAN_INVENTORY = {
  ...JAPANESE_INVENTORY,
  channels: {
    case: {
      ...JAPANESE_INVENTORY.channels.case,
      name: {
        en: { top: 'topic (은/는)', sbj: 'subject (이/가)', obj: 'object (을/를)', tgt: 'to, at (에, 에게)', loc: 'place of action (에서)', gen: 'possessor (의)', com: 'with, and (와/과, 하고)', src: 'means, from, until ((으)로, 부터, 까지)' },
        pt: { top: 'tópico (은/는)', sbj: 'sujeito (이/가)', obj: 'objeto (을/를)', tgt: 'para, em (에, 에게)', loc: 'lugar da ação (에서)', gen: 'possuidor (의)', com: 'com, e (와/과, 하고)', src: 'meio, de, até ((으)로, 부터, 까지)' },
      },
    },
  },
  formBadge: null,
  paradigm: koreanParadigm,
  codes: layoutPairs(CODES),
};
KOREAN_INVENTORY.formBadge = new Proxy({}, { get: (_t, form) => (typeof form === 'string' && form !== 'dict' ? form : 'dict') });

export const korean = {
  code: 'ko',
  name: { en: 'Korean', pt: 'Coreano' },
  inText: { en: 'Korean', pt: 'coreano' },
  bcp47: 'ko',
  wiktionary: 'Korean',
  sources: { en: 'Wiktionary', pt: 'Wikcionário', full: { en: 'the English Wiktionary', pt: 'o Wiktionary em inglês' } },
  script: { normalize: (s) => s.normalize('NFC'), rtl: false, spaced: true, prefixOf: bucket, romanize: romanizeKo, fontScale: 1.1 },
  inventory: KOREAN_INVENTORY,
  segment,
  tokenize,
  splitWords,
  stages: [particleStage, finalVerbStage, sentenceTypeStage, adverbStage],
  government: {},
  arrange: [],
  eras: [{ id: 'modern', label: 'Present-day standard Korean', authors: '', ages: [], ipa: [] }],
  dataPath: '/data/ko',
  samplesPath: '/samples/ko',
  voice: { espeak: 'ko', natural: null },
  game: { ROWS, LETTERS, LABELS, createGame, createGrid },
  drillNames: { letters: { en: 'Hangul', pt: 'Hangul' }, nouns: { en: 'Adjective forms', pt: 'Formas dos adjetivos' }, verbs: { en: 'Verb forms', pt: 'Formas verbais' } },
};
