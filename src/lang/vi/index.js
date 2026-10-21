/* Vietnamese (2026-10-21; docs/languages/vi.md). No inflection: the colours are the roles from word order; words of
 * several syllables are joined from the dictionary. */
import { makeCaseLanguage } from '../caseLanguage.js';
import { closedStage, roleStage, splitWords } from './stages.js';
import CODES from './codes.js';

const C = (id, badge, en, pt) => ({ id, badge, en, pt });
export const vietnamese = { ...makeCaseLanguage({
  code: 'vi', name: { en: 'Vietnamese', pt: 'Vietnamita' }, inText: { en: 'Vietnamese', pt: 'vietnamita' }, bcp47: 'vi', wiktionary: 'Vietnamese',
  cases: [C('sbj', 'Suj', 'subject', 'sujeito'), C('obj', 'OD', 'direct object', 'objeto direto'), C('iobj', 'OI', 'indirect object (cho + noun)', 'objeto indireto (cho + nome)')],
  hues: ['sbj', 'obj', 'iobj'],
  and: ['và', 'hoặc', 'hay'], copulas: ['là'],
  codes: CODES, voice: { espeak: 'vi' }, address: [],
  splitWords, preStages: [closedStage], extraStages: [roleStage],
  eras: [{ id: 'modern', label: 'Modern Vietnamese', authors: '', ages: [], ipa: [] }],
}), noNounEndings: true };
