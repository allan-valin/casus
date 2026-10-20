/* French (2026-10-20; docs/languages/fr.md). No cases: the colours are the roles — subject, direct object, indirect
 * object — read from word order, the articles and the clitics (stages.js, on the shared Romance rules). */
import { makeCaseLanguage } from '../caseLanguage.js';
import { closedStage, roleStage } from './stages.js';
import CODES from './codes.js';

const C = (id, badge, en, pt) => ({ id, badge, en, pt });
export const french = { ...makeCaseLanguage({
  code: 'fr', name: { en: 'French', pt: 'Francês' }, inText: { en: 'French', pt: 'francês' }, bcp47: 'fr-FR', wiktionary: 'French',
  cases: [C('sbj', 'Suj', 'subject', 'sujeito'), C('obj', 'OD', 'direct object', 'objeto direto'), C('iobj', 'OI', 'indirect object (à + noun; lui, leur)', 'objeto indireto (à + nome; lui, leur)')],
  hues: ['sbj', 'obj', 'iobj'],
  and: ['et', 'ou'], copulas: ['est', 'sont', 'était', 'étaient', 'sera', 'suis', 'es', 'sommes', 'êtes'],
  codes: CODES, voice: { espeak: 'fr-fr', natural: { voiceId: 'fr_FR-siwis-medium', name: 'Siwis', sizeMB: 63 } }, address: [],
  preStages: [closedStage], extraStages: [roleStage],
  eras: [{ id: 'modern', label: 'Modern French', authors: '', ages: [], ipa: [] }],
}), noNounEndings: true };
