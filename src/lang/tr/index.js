/* Turkish (docs/languages/tr.md; overnight 2026-10-19): the case suffixes on the hues; vowel harmony in the forms. */
import { makeCaseLanguage } from '../caseLanguage.js';
import CODES from './codes.js';
import { splitWords, copulaStage } from './copula.js';

const C = (id, badge, en, pt) => ({ id, badge, en, pt });
export const turkish = makeCaseLanguage({
  code: 'tr', name: { en: 'Turkish', pt: 'Turco' }, inText: { en: 'Turkish', pt: 'turco' }, bcp47: 'tr', wiktionary: 'Turkish',
  cases: [C('nom', 'Yalın', 'nominative (yalın)', 'nominativo'), C('acc', 'Bel', 'accusative, definite (-(y)ı)', 'acusativo definido'), C('dat', 'Yön', 'dative (-(y)a: to)', 'dativo (para)'),
    C('loc', 'Bul', 'locative (-da: in, at)', 'locativo (em)'), C('abl', 'Çık', 'ablative (-dan: from)', 'ablativo (de)'), C('gen', 'İlg', 'genitive (-(n)ın: of)', 'genitivo (de)'),
    C('ins', 'Vas', 'instrumental (-(y)la: with)', 'instrumental (com)')],
  hues: ['nom', 'acc', 'dat', 'loc', 'abl', 'gen'], shares: { ins: 'dat' }, borders: { ins: 'dotted' },
  and: ['ve', 'veya', 'ya da'], copulas: [],
  splitWords, preStages: [copulaStage],
  codes: CODES, voice: { espeak: 'tr', natural: { voiceId: 'tr_TR-dfki-medium', name: 'DFKI', sizeMB: 63 } }, address: [],
});
