/* Portuguese, as spoken in Brazil (docs/languages/pt.md; overnight 2026-10-19). No cases: the colours are the roles —
 * subject, direct object, indirect object — read from word order, the articles and the clitics (stages.js). */
import { makeCaseLanguage } from '../caseLanguage.js';
import { closedStage, roleStage } from './stages.js';
import CODES from './codes.js';

const C = (id, badge, en, pt) => ({ id, badge, en, pt });
export const portuguese = { ...makeCaseLanguage({
  code: 'pt', name: { en: 'Portuguese (Brazil)', pt: 'Português (Brasil)' }, inText: { en: 'Portuguese', pt: 'português' }, bcp47: 'pt-BR', wiktionary: 'Portuguese',
  cases: [C('sbj', 'Suj', 'subject', 'sujeito'), C('obj', 'OD', 'direct object', 'objeto direto'), C('iobj', 'OI', 'indirect object (a, para + noun; lhe)', 'objeto indireto (a, para + nome; lhe)')],
  hues: ['sbj', 'obj', 'iobj'],
  and: ['e', 'ou'], copulas: ['é', 'são', 'está', 'estão', 'foi', 'era', 'estava'],
  codes: CODES, voice: { espeak: 'pt-br', natural: { voiceId: 'pt_BR-faber-medium', name: 'Faber', sizeMB: 63 } }, address: [],
  preStages: [closedStage], extraStages: [roleStage],
  eras: [{ id: 'modern', label: 'Brazilian Portuguese', authors: '', ages: [], ipa: [] }],
}), noNounEndings: true };
