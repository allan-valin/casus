/* Romanian (2026-10-21; docs/languages/ro.md): nominative-accusative, genitive-dative and vocative; the article is
 * an ending (casa, casei), so a noun's form shows its case where the article is there. Prepositions mostly take the
 * accusative, a few the genitive or the dative. */
import { makeCaseLanguage } from '../caseLanguage.js';
import CODES from './codes.js';
import { stripRo, hasMarksRo } from './script.js';
import { splitWords } from './tokenize.js';

const C = (id, badge, en, pt) => ({ id, badge, en, pt });
const ACC = ['pe', 'la', 'în', 'cu', 'de', 'din', 'pentru', 'spre', 'prin', 'despre', 'fără', 'sub', 'peste', 'până', 'după', 'lângă', 'între', 'dintre', 'printre', 'către', 'de la', 'pe la', 'pînă', 'întru'];
export const romanian = makeCaseLanguage({
  code: 'ro', name: { en: 'Romanian', pt: 'Romeno' }, inText: { en: 'Romanian', pt: 'romeno' }, bcp47: 'ro', wiktionary: 'Romanian',
  cases: [C('nom', 'Nm', 'nominative (nominativ)', 'nominativo'), C('acc', 'Ac', 'accusative (acuzativ)', 'acusativo'), C('gen', 'Gn', 'genitive (genitiv)', 'genitivo'),
    C('dat', 'Dt', 'dative (dativ)', 'dativo'), C('voc', 'Vc', 'vocative (vocativ)', 'vocativo')],
  hues: ['nom', 'acc', 'gen', 'dat'], shares: { voc: 'nom' }, borders: { voc: 'dotted' },
  government: { ...Object.fromEntries(ACC.map((p) => [p, ['acc']])), deasupra: ['gen'], dedesubtul: ['gen'], înaintea: ['gen'], împotriva: ['gen'], asupra: ['gen'],
    contra: ['gen'], împrejurul: ['gen'], înapoia: ['gen'], datorită: ['dat'], grație: ['dat'], conform: ['dat'], potrivit: ['dat'], mulțumită: ['dat'] },
  and: ['și', 'iar', 'sau', 'ori'], copulas: ['este', 'e', 'sunt', 'ești', 'suntem', 'sunteți', 'era', 'erau', 'a fost', 'fi'],
  pronounPerson: { eu: '1', tu: '2', el: '3', ea: '3', noi: '1', voi: '2', ei: '3', ele: '3' },
  script: { prefixOf: stripRo, strip: stripRo, hasMarks: hasMarksRo },
  splitWords,
  codes: CODES, voice: { espeak: 'ro', natural: { voiceId: 'ro_RO-mihai-medium', name: 'Mihai', sizeMB: 63 } }, address: [],
});
