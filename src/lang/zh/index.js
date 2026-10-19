/* Chinese, Mandarin (docs/languages/zh.md; overnight plan 2026-10-19). */
import { segment } from '../ja/segment.js';
import { tokenize, splitWords } from '../ja/tokenize.js';
import { bucket } from '../ja/bucket.js';
import { JAPANESE_INVENTORY } from '../ja/inventory.js';
import { prepStage, deStage, readingStage } from './stages.js';
import { ROWS, LETTERS, LABELS, createGame, createGrid } from './game.js';
import CODES from './codes.js';

function layoutPairs(json) {
  const LAYOUT = {};
  for (const [pos, names] of Object.entries(json.LAYOUT)) LAYOUT[pos] = names.map((n) => [n, json.TABLES[n]]);
  return { POS: json.POS, LAYOUT, json };
}
const CHINESE_INVENTORY = {
  ...JAPANESE_INVENTORY,
  channels: { case: { ...JAPANESE_INVENTORY.channels.case,
    name: {
      en: { top: 'topic', sbj: 'agent (被)', obj: 'object brought forward (把)', tgt: 'to, for (给, 对, 向)', loc: 'place (在)', gen: 'possessor, modifier (的)', com: 'with, and (跟, 和)', src: 'from (从, 离)' },
      pt: { top: 'tópico', sbj: 'agente (被)', obj: 'objeto anteposto (把)', tgt: 'para (给, 对, 向)', loc: 'lugar (在)', gen: 'possuidor, modificador (的)', com: 'com, e (跟, 和)', src: 'de (从, 离)' },
    } } },
  families: { nominal: ['noun', 'pron', 'num', 'classifier'], verb: ['verb', 'adj'], function: '*' },
  formBadge: { undefined: '' },
  paradigm: () => [],
  codes: layoutPairs(CODES),
};

export const chinese = {
  code: 'zh',
  name: { en: 'Chinese', pt: 'Chinês' },
  inText: { en: 'Chinese', pt: 'chinês' },
  bcp47: 'zh-CN',
  wiktionary: 'Chinese',
  sources: { en: 'Wiktionary', pt: 'Wikcionário', full: { en: 'the English Wiktionary', pt: 'o Wiktionary em inglês' } },
  script: { normalize: (s) => s.normalize('NFC'), rtl: false, spaced: false, prefixOf: bucket, romanize: (t) => t, fontScale: 1.15 },
  inventory: CHINESE_INVENTORY,
  segment,
  tokenize,
  splitWords,
  stages: [prepStage, deStage, readingStage],
  government: {},
  arrange: [],
  eras: [{ id: 'modern', label: 'Standard Mandarin', authors: '', ages: [], ipa: [] }],
  dataPath: '/data/zh',
  samplesPath: '/samples/zh',
  voice: { espeak: 'cmn', natural: null },
  game: { ROWS, LETTERS, LABELS, createGame, createGrid },
  drillNames: { letters: { en: 'Characters', pt: 'Caracteres' }, words: { en: 'Frequent words', pt: 'Palavras frequentes' } },
  noEndings: true,
};
