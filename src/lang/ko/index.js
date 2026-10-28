/* Korean (docs/languages/ko.md; overnight plan 2026-10-19). */
import { segment } from '../ar/segment.js';
import { tokenize, splitWords } from './tokenize.js';
import { particleStage, finalVerbStage, adverbStage, sentenceTypeStage, copulaStage, pronounStage, negationStage } from './stages.js';
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
// the badge: a connective or modifier shows its ending, a sentence ending its speech level (formal, polite, casual,
// plain), past and sentence type (Allan, 2026-10-19: 가실 showed "handa")
const ENDING = { inf: '-어', seq: '-니', and: '-고', if: '-면', so: '-어서', even: '-어도', but: '-지만', since: '-니까', ji: '-지', ge: '-게', noun: '-기',
  will: '-겠', intent: '-려고', purpose: '-러', 'adn pres': '-는', 'adn past': '-ㄴ', 'adn fut': '-ㄹ', bg: '-는데' };
const LEVEL = { hamnida: 'fml', haeyo: 'pol', hae: 'cas', handa: 'pln' };
function koreanBadge(form) {
  if (typeof form !== 'string' || form === 'dict') return 'dict';
  if (ENDING[form]) return ENDING[form];
  const [level, ...rest] = form.split(' ');
  if (!LEVEL[level]) return form;
  const past = rest.includes('past') ? ' pst' : '';
  const kind = rest.includes('q') ? '?' : rest.includes('imp') ? '!' : rest.includes('let') ? ' let' : '';
  return `${LEVEL[level]}${past}${kind}`;
}
KOREAN_INVENTORY.formBadge = new Proxy({}, { get: (_t, form) => koreanBadge(form) });

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
  stages: [copulaStage, pronounStage, negationStage, particleStage, finalVerbStage, sentenceTypeStage, adverbStage],
  government: {},
  arrange: [],
  eras: [{ id: 'modern', label: 'Present-day standard Korean', authors: '', ages: [], ipa: [] }],
  dataPath: '/data/ko',
  samplesPath: '/samples/ko',
  // natural voice: Piper kss (one female speaker), reading the sounds the Conversation course carries (2026-10-28)
  voice: { espeak: 'ko', natural: { voiceId: 'ko_KR-kss-medium', name: 'KSS (Korean, female)', sizeMB: 63, phonemes: 'ko' } },
  game: { ROWS, LETTERS, LABELS, createGame, createGrid },
  drillNames: { letters: { en: 'Hangul', pt: 'Hangul' }, nouns: { en: 'Adjective forms', pt: 'Formas dos adjetivos' }, verbs: { en: 'Verb forms', pt: 'Formas verbais' } },
};
