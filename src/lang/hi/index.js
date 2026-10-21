/* Hindi (2026-10-21; docs/languages/hi.md): direct, oblique and vocative, with postpositions after the noun (and
 * the pronouns' ergative, dative and genitive forms); Devanagari; sentences end at the danda. */
import { makeCaseLanguage } from '../caseLanguage.js';
import CODES from './codes.js';
import { postpositionStage, closedStage } from './stages.js';

const END = /[।॥.!?]+|\n+/g;
function segment(text) {
  const out = [];
  let start = 0;
  const push = (end) => { const slice = text.slice(start, end); const lead = slice.length - slice.trimStart().length; const t = slice.trim(); if (t) out.push({ text: t, start: start + lead, end: start + lead + t.length }); start = end; };
  for (let m = END.exec(text); m; m = END.exec(text)) push(m.index + m[0].length);
  push(text.length);
  return out;
}
// Devanagari words: letters, vowel signs, nukta, virama, anusvara, chandrabindu (\p{L} misses the combining signs)
const WORD = /[ऀ-ॣॱ-ॿ]+/gu;
function tokenize(sentenceText) {
  const tokens = [];
  let at = 0;
  const punct = (from, to) => { for (const m of sentenceText.slice(from, to).matchAll(/\S+/g)) tokens.push({ surface: m[0], kind: 'punct', key: m[0], start: from + m.index, end: from + m.index + m[0].length, enclitic: null }); };
  for (const m of sentenceText.matchAll(WORD)) {
    if (m.index > at) punct(at, m.index);
    tokens.push({ surface: m[0], kind: 'word', key: m[0].normalize('NFC'), start: m.index, end: m.index + m[0].length, enclitic: null });
    at = m.index + m[0].length;
  }
  if (at < sentenceText.length) punct(at, sentenceText.length);
  return tokens;
}

const C = (id, badge, en, pt) => ({ id, badge, en, pt });
export const hindi = makeCaseLanguage({
  code: 'hi', name: { en: 'Hindi', pt: 'Híndi' }, inText: { en: 'Hindi', pt: 'híndi' }, bcp47: 'hi', wiktionary: 'Hindi',
  cases: [C('dir', 'Di', 'direct (कर्ता, no postposition)', 'direto (sem posposição)'), C('obl', 'Ob', 'oblique (before a postposition)', 'oblíquo (antes de posposição)'),
    C('voc', 'Vc', 'vocative', 'vocativo'), C('erg', 'Er', 'ergative (pronoun + ने)', 'ergativo (pronome + ने)'), C('dat', 'Dt', 'dative (मुझे, उसे…)', 'dativo (मुझे, उसे…)'), C('gen', 'Gn', 'genitive (मेरा, उसका…)', 'genitivo (मेरा, उसका…)')],
  hues: ['dir', 'obl', 'erg', 'dat', 'gen', 'voc'],
  and: ['और', 'या', 'तथा', 'एवं'], copulas: ['है', 'हैं', 'हूँ', 'हो', 'था', 'थी', 'थे', 'थीं'],
  pronounPerson: { मैं: '1', तू: '2', तुम: '2', आप: '2', वह: '3', यह: '3', हम: '1', वे: '3', ये: '3' },
  script: { rtl: false, spaced: true, fontScale: 1.2 },
  tokenize, segment, preStages: [closedStage], extraStages: [postpositionStage],
  codes: CODES, voice: { espeak: 'hi' }, address: [],
});
