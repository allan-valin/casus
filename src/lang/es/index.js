/* Spanish (2026-10-20; docs/languages/es.md). No cases: the colours are the roles — subject, direct object, indirect
 * object — read from word order, the articles and the clitics (stages.js, on the shared Romance rules). */
import { makeCaseLanguage } from '../caseLanguage.js';
import { closedStage, roleStage } from './stages.js';
import CODES from './codes.js';

const C = (id, badge, en, pt) => ({ id, badge, en, pt });
export const spanish = { ...makeCaseLanguage({
  code: 'es', name: { en: 'Spanish', pt: 'Espanhol' }, inText: { en: 'Spanish', pt: 'espanhol' }, bcp47: 'es-ES', wiktionary: 'Spanish',
  cases: [C('sbj', 'Suj', 'subject', 'sujeito'), C('obj', 'OD', 'direct object', 'objeto direto'), C('iobj', 'OI', 'indirect object (a + noun; le, les)', 'objeto indireto (a + nome; le, les)')],
  hues: ['sbj', 'obj', 'iobj'],
  and: ['y', 'e', 'o', 'u'], copulas: ['es', 'son', 'está', 'están', 'era', 'fue', 'estaba', 'soy', 'eres', 'somos'],
  codes: CODES, voice: { espeak: 'es', natural: { voiceId: 'es_ES-davefx-medium', name: 'Dave', sizeMB: 63 } }, address: [],
  preStages: [closedStage], extraStages: [roleStage],
  eras: [{ id: 'modern', label: 'Modern Spanish', authors: '', ages: [], ipa: [] }],
}), noNounEndings: true };
