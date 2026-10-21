/* Swahili (2026-10-21; docs/languages/sw.md). No cases: the colours are the roles from word order; noun classes and
 * the verb's prefixes come from the dictionary's tables. */
import { makeCaseLanguage } from '../caseLanguage.js';
import { closedStage, roleStage, splitWords } from './stages.js';
import CODES from './codes.js';

const C = (id, badge, en, pt) => ({ id, badge, en, pt });
export const swahili = { ...makeCaseLanguage({
  code: 'sw', name: { en: 'Swahili', pt: 'Suaíli' }, inText: { en: 'Swahili', pt: 'suaíli' }, bcp47: 'sw', wiktionary: 'Swahili',
  cases: [C('sbj', 'Suj', 'subject', 'sujeito'), C('obj', 'OD', 'direct object', 'objeto direto'), C('iobj', 'OI', 'indirect object', 'objeto indireto')],
  hues: ['sbj', 'obj', 'iobj'],
  and: ['na', 'au', 'wala'], copulas: ['ni', 'si', 'ndiye', 'ndio'],
  codes: CODES, voice: { espeak: 'sw' }, address: [],
  splitWords, preStages: [closedStage], extraStages: [roleStage],
  eras: [{ id: 'modern', label: 'Modern Swahili', authors: '', ages: [], ipa: [] }],
}), noNounEndings: true };
