/* Swedish (2026-10-21; docs/languages/sv.md). No cases but in the pronouns: the colours are the roles — subject,
 * direct object, indirect object — from the pronoun's form and word order (verb second). */
import { makeCaseLanguage } from '../caseLanguage.js';
import { closedStage, roleStage, subjectPronounStage } from './stages.js';
import CODES from './codes.js';

const C = (id, badge, en, pt) => ({ id, badge, en, pt });
export const swedish = { ...makeCaseLanguage({
  code: 'sv', name: { en: 'Swedish', pt: 'Sueco' }, inText: { en: 'Swedish', pt: 'sueco' }, bcp47: 'sv', wiktionary: 'Swedish',
  cases: [C('sbj', 'Suj', 'subject', 'sujeito'), C('obj', 'OD', 'direct object', 'objeto direto'), C('iobj', 'OI', 'indirect object (till / åt + noun)', 'objeto indireto (till / åt + nome)')],
  hues: ['sbj', 'obj', 'iobj'],
  and: ['och', 'eller'], copulas: ['är', 'var', 'vara', 'varit', 'blir', 'blev', 'bli'],
  codes: CODES, voice: { espeak: 'sv', natural: { voiceId: 'sv_SE-nst-medium', name: 'NST', sizeMB: 63 } }, address: [],
  preStages: [closedStage], extraStages: [roleStage, subjectPronounStage],
  eras: [{ id: 'modern', label: 'Modern Swedish', authors: '', ages: [], ipa: [] }],
}), noNounEndings: true };
