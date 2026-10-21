/* Persian (2026-10-21; docs/languages/fa.md). No cases: the colours are the roles — subject, the direct object marked
 * by را, the indirect object after به — in a subject–object–verb language; Arabic script, right to left, with the
 * zero-width non-joiner inside words (می‌روم). */
import { makeCaseLanguage } from '../caseLanguage.js';
import { closedStage, roleStage, splitWords } from './stages.js';
import { stripFa, hasMarksFa } from './script.js';
import CODES from './codes.js';

const WORD = /[ء-غف-يً-ٰٕپچژکگیۀە‌]+/g;
function tokenize(sentenceText) {
  const tokens = [];
  let at = 0;
  const punct = (from, to) => { for (const m of sentenceText.slice(from, to).matchAll(/\S+/g)) tokens.push({ surface: m[0], kind: 'punct', key: m[0], start: from + m.index, end: from + m.index + m[0].length, enclitic: null }); };
  for (const m of sentenceText.matchAll(WORD)) {
    const w = m[0].replace(/^‌+|‌+$/g, '');
    if (!w) continue;
    if (m.index > at) punct(at, m.index);
    tokens.push({ surface: m[0], kind: 'word', key: stripFa(m[0]), start: m.index, end: m.index + m[0].length, enclitic: null });
    at = m.index + m[0].length;
  }
  if (at < sentenceText.length) punct(at, sentenceText.length);
  return tokens;
}

const C = (id, badge, en, pt) => ({ id, badge, en, pt });
export const persian = { ...makeCaseLanguage({
  code: 'fa', name: { en: 'Persian', pt: 'Persa' }, inText: { en: 'Persian', pt: 'persa' }, bcp47: 'fa', wiktionary: 'Persian',
  cases: [C('sbj', 'Suj', 'subject', 'sujeito'), C('obj', 'OD', 'direct object (+ را)', 'objeto direto (+ را)'), C('iobj', 'OI', 'indirect object (به + noun)', 'objeto indireto (به + nome)')],
  hues: ['sbj', 'obj', 'iobj'],
  and: ['و', 'یا'], copulas: ['است', 'هست', 'بود', 'هستم', 'هستی', 'هستیم', 'هستید', 'هستند'],
  codes: CODES, voice: { espeak: 'fa' }, address: [],
  script: { normalize: (s) => s.normalize('NFC'), rtl: true, spaced: true, prefixOf: stripFa, strip: stripFa, hasMarks: hasMarksFa, fontScale: 1.35 },
  tokenize, splitWords, preStages: [closedStage], extraStages: [roleStage],
  eras: [{ id: 'modern', label: 'Modern Persian', authors: '', ages: [], ipa: [] }],
}), noNounEndings: true };
