/* Bengali (2026-10-21; docs/languages/bn.md): nominative, objective (-কে), genitive (-এর / -র) and locative (-এ / -তে)
 * on the noun, with the classifiers -টা / -টি; verbs by person and politeness, not number; Bengali script; sentences
 * end at the danda. */
import { makeCaseLanguage } from '../caseLanguage.js';
import CODES from './codes.js';
import { closedStage } from './stages.js';

const END = /[।॥.!?]+|\n+/g;
function segment(text) {
  const out = [];
  let start = 0;
  const push = (end) => { const slice = text.slice(start, end); const lead = slice.length - slice.trimStart().length; const t = slice.trim(); if (t) out.push({ text: t, start: start + lead, end: start + lead + t.length }); start = end; };
  for (let m = END.exec(text); m; m = END.exec(text)) push(m.index + m[0].length);
  push(text.length);
  return out;
}
// Bengali words: letters, vowel signs, hasanta, nukta, chandrabindu, khanda ta (\p{L} misses the combining signs)
const WORD = /[ঀ-ৣৰ-৾]+/gu;
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
export const bengali = makeCaseLanguage({
  code: 'bn', name: { en: 'Bengali', pt: 'Bengali' }, inText: { en: 'Bengali', pt: 'bengali' }, bcp47: 'bn', wiktionary: 'Bengali',
  cases: [C('nom', 'Nm', 'nominative (কর্তা)', 'nominativo'), C('obj', 'Ob', 'objective (-কে: whom, to whom)', 'objetivo (-কে: a quem)'),
    C('gen', 'Gn', 'genitive (-এর / -র)', 'genitivo (-এর / -র)'), C('loc', 'Lc', 'locative (-এ / -তে)', 'locativo (-এ / -তে)')],
  hues: ['nom', 'obj', 'gen', 'loc'],
  and: ['এবং', 'আর', 'ও', 'বা'], copulas: ['আছে', 'আছি', 'আছো', 'আছেন', 'ছিল', 'ছিলাম', 'হয়'],
  pronounPerson: { আমি: '1', তুমি: '2', তুই: '2', আপনি: '2', সে: '3', তিনি: '3', আমরা: '1', তোমরা: '2', তারা: '3' },
  script: { rtl: false, spaced: true, fontScale: 1.2 },
  tokenize, segment, preStages: [closedStage],
  codes: CODES, voice: { espeak: 'bn' }, address: [],
});
