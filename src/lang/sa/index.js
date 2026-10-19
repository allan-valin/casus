/* Sanskrit (docs/languages/sa.md; overnight 2026-10-19): eight cases, three numbers, Devanagari with IAST under it. */
import { makeCaseLanguage } from '../caseLanguage.js';
import { cleanSa, romanizeSa } from './script.js';
import { ROWS, LETTERS, LABELS, createGame, createGrid } from './game.js';
import CODES from './codes.js';
import { splitWords } from './sandhi.js';

// sentences end at the danda (। ॥) as well as . ! ?
const END = /[\u0964\u0965.!?]+|\n+/g;
function segment(text) {
  const out = [];
  let start = 0;
  const push = (end) => { const slice = text.slice(start, end); const lead = slice.length - slice.trimStart().length; const t = slice.trim(); if (t) out.push({ text: t, start: start + lead, end: start + lead + t.length }); start = end; };
  for (let m = END.exec(text); m; m = END.exec(text)) push(m.index + m[0].length);
  push(text.length);
  return out;
}

const C = (id, badge, en, pt) => ({ id, badge, en, pt });
// Devanagari words: letters, vowel signs, virama, anusvara, visarga (\p{L} misses the combining signs)
const WORD = /[ऀ-ॣॱ-ॿ᳐-᳿]+/gu;
function tokenize(sentenceText) {
  const tokens = [];
  let at = 0;
  const punct = (from, to) => { for (const m of sentenceText.slice(from, to).matchAll(/\S+/g)) tokens.push({ surface: m[0], kind: 'punct', key: m[0], start: from + m.index, end: from + m.index + m[0].length, enclitic: null }); };
  for (const m of sentenceText.matchAll(WORD)) {
    if (m.index > at) punct(at, m.index);
    tokens.push({ surface: m[0], kind: 'word', key: cleanSa(m[0]), start: m.index, end: m.index + m[0].length, enclitic: null, clause: 0 });
    at = m.index + m[0].length;
  }
  if (at < sentenceText.length) punct(at, sentenceText.length);
  return tokens;
}
export const sanskrit = makeCaseLanguage({
  code: 'sa',
  name: { en: 'Sanskrit', pt: 'Sânscrito' },
  inText: { en: 'Sanskrit', pt: 'sânscrito' },
  bcp47: 'sa',
  wiktionary: 'Sanskrit',
  cases: [C('nom', 'Nm', 'nominative (prathamā)', 'nominativo'), C('acc', 'Ac', 'accusative (dvitīyā)', 'acusativo'), C('ins', 'In', 'instrumental (tṛtīyā)', 'instrumental'),
    C('dat', 'Dt', 'dative (caturthī)', 'dativo'), C('abl', 'Ab', 'ablative (pañcamī)', 'ablativo'), C('gen', 'Gn', 'genitive (ṣaṣṭhī)', 'genitivo'),
    C('loc', 'Lc', 'locative (saptamī)', 'locativo'), C('voc', 'Vc', 'vocative (sambodhana)', 'vocativo')],
  hues: ['nom', 'acc', 'ins', 'dat', 'gen', 'loc'],
  shares: { abl: 'gen', voc: 'nom' },
  borders: { abl: 'double', voc: 'dotted' },
  and: ['च', 'वा'],
  copulas: ['अस्ति', 'सन्ति', 'आसीत्'],
  codes: CODES,
  voice: { espeak: 'sa', natural: null },
  script: { prefixOf: cleanSa, romanize: romanizeSa },
  tokenize,
  segment,
  splitWords,
  game: { ROWS, LETTERS, LABELS, createGame, createGrid },
  address: ['हे', 'भो'],
  eras: [{ id: 'classical', label: 'Classical Sanskrit (with Vedic forms where Wiktionary lists them)', authors: '', ages: [], ipa: [] }],
});
