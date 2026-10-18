/* Japanese (overnight plan 2026-10-19): no cases — the particles mark roles, so the primary channel is the role a
 * particle gives the word before it, on the same Okabe–Ito hues as the cases elsewhere. Verbs and adjectives
 * (both conjugate) carry their form as the badge. */
import CODES from './codes.js';
import { japaneseParadigm } from './paradigm.js';

function layoutPairs(json) {
  const LAYOUT = {};
  for (const [pos, names] of Object.entries(json.LAYOUT)) LAYOUT[pos] = names.map((n) => [n, json.TABLES[n]]);
  return { POS: json.POS, LAYOUT, json };
}

export const ROLE_OF = { は: 'top', が: 'sbj', を: 'obj', に: 'tgt', へ: 'tgt', で: 'loc', の: 'gen', と: 'com', から: 'src', まで: 'src', より: 'src' };

export const JAPANESE_INVENTORY = {
  primary: 'case',
  channels: {
    case: {
      values: ['sbj', 'obj', 'tgt', 'loc', 'gen', 'top', 'com', 'src'],
      hueOrder: ['sbj', 'obj', 'tgt', 'loc', 'gen', 'top'],
      sharesHueOf: { com: 'tgt', src: 'loc' },
      border: { com: 'double', src: 'double' },
      badge: { top: 'Tp', sbj: 'Sb', obj: 'Ob', tgt: 'To', loc: 'At', gen: 'Of', com: 'Wi', src: 'Fr' },
      name: {
        en: { top: 'topic (は)', sbj: 'subject (が)', obj: 'object (を)', tgt: 'target, direction (に, へ)', loc: 'place of action, means (で)', gen: 'possessor (の)', com: 'with, and (と)', src: 'from, until, than (から, まで, より)' },
        pt: { top: 'tópico (は)', sbj: 'sujeito (が)', obj: 'objeto (を)', tgt: 'alvo, direção (に, へ)', loc: 'lugar da ação, meio (で)', gen: 'possuidor (の)', com: 'com, e (と)', src: 'de, até, que (から, まで, より)' },
      },
    },
  },
  families: { nominal: ['noun', 'pron', 'num', 'counter', 'suffix', 'prefix'], verb: ['verb', 'adj', 'aux'], function: '*' },
  formBadge: { dict: 'dict', neg: 'neg', past: 'past', pastneg: 'past neg', te: 'te', polite: 'pol', politeneg: 'pol neg', politepast: 'pol past',
    politepastneg: 'pol past neg', politevol: 'pol vol', stem: 'stem', vol: 'vol', pot: 'can', pass: 'pass', caus: 'caus', cond: 'if', tara: 'if',
    imp: 'imp', des: 'want', desneg: 'want neg', despast: 'want past', negte: 'neg te', negcond: 'neg if', zu: 'neg', adv: 'adv', attr: 'attr',
    noun: 'noun', seem: 'seem', copula: 'cop' },
  agreement: { targets: [], witnesses: [] },
  paradigm: japaneseParadigm,
  codes: layoutPairs(CODES),
};
