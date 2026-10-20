/* Italian (2026-10-20; docs/languages/it.md). No cases: the colours are the roles — subject, direct object, indirect
 * object — read from word order, the articles and the clitics (stages.js, on the shared Romance rules). */
import { makeCaseLanguage } from '../caseLanguage.js';
import { closedStage, roleStage } from './stages.js';
import CODES from './codes.js';

const C = (id, badge, en, pt) => ({ id, badge, en, pt });
export const italian = { ...makeCaseLanguage({
  code: 'it', name: { en: 'Italian', pt: 'Italiano' }, inText: { en: 'Italian', pt: 'italiano' }, bcp47: 'it-IT', wiktionary: 'Italian',
  cases: [C('sbj', 'Sogg', 'subject', 'sujeito'), C('obj', 'OD', 'direct object', 'objeto direto'), C('iobj', 'OI', 'indirect object (a + noun; gli, le)', 'objeto indireto (a + nome; gli, le)')],
  hues: ['sbj', 'obj', 'iobj'],
  and: ['e', 'ed', 'o', 'oppure'], copulas: ['è', 'sono', 'era', 'erano', 'sei', 'siamo', 'siete', 'fu', 'stato', 'stata'],
  codes: CODES, voice: { espeak: 'it', natural: { voiceId: 'it_IT-paola-medium', name: 'Paola', sizeMB: 63 } }, address: [],
  preStages: [closedStage], extraStages: [roleStage],
  eras: [{ id: 'modern', label: 'Modern Italian', authors: '', ages: [], ipa: [] }],
}), noNounEndings: true };
