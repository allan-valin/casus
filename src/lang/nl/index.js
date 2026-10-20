/* Dutch (2026-10-20; docs/languages/nl.md). No cases but in the pronouns: the
 * colours are the roles — subject, direct object, indirect object — from the pronoun's form and word order. */
import { makeCaseLanguage } from '../caseLanguage.js';
import { closedStage, roleStage } from './stages.js';
import CODES from './codes.js';

const C = (id, badge, en, pt) => ({ id, badge, en, pt });
export const dutch = { ...makeCaseLanguage({
  code: 'nl', name: { en: 'Dutch', pt: 'Holandês' }, inText: { en: 'Dutch', pt: 'holandês' }, bcp47: 'nl', wiktionary: 'Dutch',
  cases: [C('sbj', 'Suj', 'subject', 'sujeito'), C('obj', 'OD', 'direct object', 'objeto direto'), C('iobj', 'OI', 'indirect object (aan + noun; hun)', 'objeto indireto (aan + nome; hun)')],
  hues: ['sbj', 'obj', 'iobj'],
  and: ['en', 'of'], copulas: ['is', 'zijn', 'was', 'waren', 'ben', 'bent', 'geweest'],
  codes: CODES, voice: { espeak: 'nl', natural: { voiceId: 'nl_NL-mls-medium', name: 'MLS', sizeMB: 63 } }, address: [],
  preStages: [closedStage], extraStages: [roleStage],
  eras: [{ id: 'modern', label: 'Modern Dutch', authors: '', ages: [], ipa: [] }],
}), noNounEndings: true };
