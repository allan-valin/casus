/* Icelandic (docs/languages/is.md; overnight 2026-10-19): four cases, prepositions with dative or accusative. */
import { makeCaseLanguage } from '../caseLanguage.js';
import CODES from './codes.js';

const C = (id, badge, en, pt) => ({ id, badge, en, pt });
export const icelandic = makeCaseLanguage({
  code: 'is', name: { en: 'Icelandic', pt: 'Islandês' }, inText: { en: 'Icelandic', pt: 'islandês' }, bcp47: 'is', wiktionary: 'Icelandic',
  cases: [C('nom', 'Nf', 'nominative (nefnifall)', 'nominativo'), C('acc', 'Þf', 'accusative (þolfall)', 'acusativo'), C('dat', 'Þgf', 'dative (þágufall)', 'dativo'), C('gen', 'Ef', 'genitive (eignarfall)', 'genitivo')],
  hues: ['nom', 'acc', 'dat', 'gen'],
  government: { í: ['dat', 'acc'], á: ['dat', 'acc'], til: ['gen'], frá: ['dat'], af: ['dat'], með: ['dat', 'acc'], um: ['acc'], við: ['acc', 'dat'], fyrir: ['acc', 'dat'],
    hjá: ['dat'], án: ['gen'], undir: ['acc', 'dat'], yfir: ['acc', 'dat'], úr: ['dat'], eftir: ['acc', 'dat'], vegna: ['gen'], gegnum: ['acc'], kringum: ['acc'] },
  and: ['og', 'eða'], copulas: ['er', 'eru', 'var', 'voru'],
  codes: CODES, voice: { espeak: 'is', natural: { voiceId: 'is_IS-bui-medium', name: 'Búi', sizeMB: 63 } }, address: [],
});
