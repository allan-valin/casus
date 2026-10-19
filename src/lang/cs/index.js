/* Czech (docs/languages/cs.md; overnight 2026-10-19): seven cases, prepositions with theirs. */
import { makeCaseLanguage } from '../caseLanguage.js';
import CODES from './codes.js';

const C = (id, badge, en, pt) => ({ id, badge, en, pt });
export const czech = makeCaseLanguage({
  code: 'cs', name: { en: 'Czech', pt: 'Tcheco' }, inText: { en: 'Czech', pt: 'tcheco' }, bcp47: 'cs', wiktionary: 'Czech',
  cases: [C('nom', 'Nm', 'nominative (1.)', 'nominativo'), C('gen', 'Gn', 'genitive (2.)', 'genitivo'), C('dat', 'Dt', 'dative (3.)', 'dativo'),
    C('acc', 'Ac', 'accusative (4.)', 'acusativo'), C('voc', 'Vc', 'vocative (5.)', 'vocativo'), C('loc', 'Lc', 'locative (6.)', 'locativo'), C('ins', 'In', 'instrumental (7.)', 'instrumental')],
  hues: ['nom', 'gen', 'dat', 'acc', 'loc', 'ins'], shares: { voc: 'nom' }, borders: { voc: 'dotted' },
  government: { v: ['loc', 'acc'], ve: ['loc', 'acc'], na: ['loc', 'acc'], s: ['ins', 'gen'], se: ['ins', 'gen'], z: ['gen'], ze: ['gen'], do: ['gen'], k: ['dat'], ke: ['dat'],
    o: ['loc', 'acc'], po: ['loc', 'acc'], u: ['gen'], od: ['gen'], bez: ['gen'], pro: ['acc'], přes: ['acc'], za: ['ins', 'acc', 'gen'], před: ['ins', 'acc'], pod: ['ins', 'acc'],
    nad: ['ins', 'acc'], mezi: ['ins', 'acc'], při: ['loc'], kvůli: ['dat'], proti: ['dat'], podle: ['gen'], během: ['gen'], vedle: ['gen'], kromě: ['gen'] },
  and: ['a', 'i', 'nebo'], copulas: ['je', 'jsou', 'byl', 'byla', 'bylo', 'byli', 'jsem', 'jsi', 'jsme', 'jste'],
  pronounPerson: { já: '1', ty: '2', on: '3', ona: '3', ono: '3', my: '1', vy: '2', oni: '3', ony: '3' },
  codes: CODES, voice: { espeak: 'cs', natural: { voiceId: 'cs_CZ-jirka-medium', name: 'Jirka', sizeMB: 63 } }, address: [],
});
