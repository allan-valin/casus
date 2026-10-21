/* Indonesian (2026-10-21; docs/languages/id.md). No cases or tenses: the colours are the roles from word order; verbs
 * show voice (membaca active, dibaca passive); clitics -nya, -ku, -mu and reduplicated plurals read apart. */
import { makeCaseLanguage } from '../caseLanguage.js';
import { closedStage, roleStage, splitWords } from './stages.js';
import CODES from './codes.js';

const C = (id, badge, en, pt) => ({ id, badge, en, pt });
export const indonesian = { ...makeCaseLanguage({
  code: 'id', name: { en: 'Indonesian', pt: 'Indonésio' }, inText: { en: 'Indonesian', pt: 'indonésio' }, bcp47: 'id', wiktionary: 'Indonesian',
  cases: [C('sbj', 'Suj', 'subject', 'sujeito'), C('obj', 'OD', 'direct object', 'objeto direto'), C('iobj', 'OI', 'indirect object (kepada / untuk + noun)', 'objeto indireto (kepada / untuk + nome)')],
  hues: ['sbj', 'obj', 'iobj'],
  and: ['dan', 'atau', 'serta'], copulas: ['adalah', 'ialah', 'merupakan'],
  codes: CODES, voice: { espeak: 'id' }, address: [],
  splitWords, preStages: [closedStage], extraStages: [roleStage],
  eras: [{ id: 'modern', label: 'Modern Indonesian', authors: '', ages: [], ipa: [] }],
}), noNounEndings: true };
