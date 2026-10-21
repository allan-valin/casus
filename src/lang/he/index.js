/* Hebrew (2026-10-21; docs/languages/he.md). No cases: the colours are the roles — subject, direct object (also
 * marked by את), indirect object (ל / אל) — from word order; prefixes split off; keys without vowel points. */
import { makeCaseLanguage } from '../caseLanguage.js';
import { closedStage, roleStage, atStage } from './stages.js';
import { tokenize, splitWords } from './tokenize.js';
import { stripHe, hasMarksHe } from './script.js';
import CODES from './codes.js';

const C = (id, badge, en, pt) => ({ id, badge, en, pt });
export const hebrew = { ...makeCaseLanguage({
  code: 'he', name: { en: 'Hebrew', pt: 'Hebraico' }, inText: { en: 'Hebrew', pt: 'hebraico' }, bcp47: 'he', wiktionary: 'Hebrew',
  cases: [C('sbj', 'Suj', 'subject', 'sujeito'), C('obj', 'OD', 'direct object (את + noun)', 'objeto direto (את + nome)'), C('iobj', 'OI', 'indirect object (ל / אל + noun)', 'objeto indireto (ל / אל + nome)')],
  hues: ['sbj', 'obj', 'iobj'],
  and: ['ו', 'או'], copulas: ['היה', 'היתה', 'הייתה', 'היו', 'יהיה', 'תהיה', 'יהיו', 'הוא', 'היא', 'הם', 'הן'],
  codes: CODES, voice: { espeak: 'he' }, address: [],
  script: { normalize: (s) => s.normalize('NFC'), rtl: true, spaced: true, prefixOf: stripHe, strip: stripHe, hasMarks: hasMarksHe, fontScale: 1.25 },
  tokenize, splitWords,
  preStages: [closedStage], extraStages: [atStage, roleStage],
  eras: [{ id: 'modern', label: 'Modern Hebrew', authors: '', ages: [], ipa: [] }],
}), noNounEndings: true };
