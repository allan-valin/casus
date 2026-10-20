/* English (2026-10-20; docs/languages/en.md), taught to Brazilians on Casus World. No cases but in the pronouns: the
 * colours are the roles — subject, direct object, indirect object — from the pronoun's form and word order. */
import { makeCaseLanguage } from '../caseLanguage.js';
import { closedStage, roleStage } from './stages.js';
import CODES from './codes.js';

const C = (id, badge, en, pt) => ({ id, badge, en, pt });
export const english = { ...makeCaseLanguage({
  code: 'en', name: { en: 'English', pt: 'Inglês' }, inText: { en: 'English', pt: 'inglês' }, bcp47: 'en-US', wiktionary: 'English',
  cases: [C('sbj', 'Suj', 'subject', 'sujeito'), C('obj', 'OD', 'direct object', 'objeto direto'), C('iobj', 'OI', 'indirect object (to + noun)', 'objeto indireto (to + nome)')],
  hues: ['sbj', 'obj', 'iobj'],
  and: ['and', 'or'], copulas: ['is', 'are', 'was', 'were', 'am', 'be', 'been'],
  codes: CODES, voice: { espeak: 'en-us', natural: { voiceId: 'en_US-lessac-medium', name: 'Lessac', sizeMB: 63 } }, address: [],
  preStages: [closedStage], extraStages: [roleStage],
  eras: [{ id: 'modern', label: 'Modern English', authors: '', ages: [], ipa: [] }],
}), noNounEndings: true };
