/* Serbo-Croatian (2026-10-21; docs/languages/sh.md): seven cases, prepositions with theirs, Latin and Cyrillic;
 * the dictionary's tone and length marks folded. Standard Bosnian, Croatian, Montenegrin and Serbian alike. */
import { makeCaseLanguage } from '../caseLanguage.js';
import CODES from './codes.js';
import { stripSh, hasMarksSh } from './script.js';

const C = (id, badge, en, pt) => ({ id, badge, en, pt });
const both = (o) => ({ ...o, ...Object.fromEntries(Object.entries(o).map(([k, v]) => [LAT2CYR(k), v])) });
const MAP = { a: 'а', b: 'б', c: 'ц', č: 'ч', ć: 'ћ', d: 'д', đ: 'ђ', e: 'е', f: 'ф', g: 'г', h: 'х', i: 'и', j: 'ј', k: 'к', l: 'л', m: 'м', n: 'н', o: 'о', p: 'п', r: 'р', s: 'с', š: 'ш', t: 'т', u: 'у', v: 'в', z: 'з', ž: 'ж' };
function LAT2CYR(w) {
  return w.replace(/dž/g, 'џ').replace(/lj/g, 'љ').replace(/nj/g, 'њ').replace(/./g, (c) => MAP[c] ?? c);
}
export const serboCroatian = makeCaseLanguage({
  code: 'sh', name: { en: 'Serbo-Croatian', pt: 'Servo-croata' }, inText: { en: 'Serbo-Croatian', pt: 'servo-croata' }, bcp47: 'sh', wiktionary: 'Serbo-Croatian',
  cases: [C('nom', 'Nm', 'nominative (nominativ)', 'nominativo'), C('gen', 'Gn', 'genitive (genitiv)', 'genitivo'), C('dat', 'Dt', 'dative (dativ)', 'dativo'),
    C('acc', 'Ac', 'accusative (akuzativ)', 'acusativo'), C('voc', 'Vc', 'vocative (vokativ)', 'vocativo'), C('loc', 'Lc', 'locative (lokativ)', 'locativo'), C('ins', 'In', 'instrumental (instrumental)', 'instrumental')],
  hues: ['nom', 'gen', 'dat', 'acc', 'ins', 'loc'], shares: { voc: 'nom' }, borders: { voc: 'dotted' },
  government: both({ u: ['loc', 'acc'], na: ['loc', 'acc'], o: ['loc', 'acc'], po: ['loc', 'acc'], pri: ['loc'], prema: ['dat', 'loc'], k: ['dat'], ka: ['dat'],
    s: ['ins', 'gen'], sa: ['ins', 'gen'], iz: ['gen'], od: ['gen'], do: ['gen'], bez: ['gen'], kod: ['gen'], za: ['acc', 'ins', 'gen'], preko: ['gen'], oko: ['gen'],
    nakon: ['gen'], poslije: ['gen'], posle: ['gen'], prije: ['gen'], pre: ['gen'], zbog: ['gen'], pored: ['gen'], blizu: ['gen'], između: ['gen'], kroz: ['acc'],
    pred: ['ins', 'acc'], nad: ['ins', 'acc'], pod: ['ins', 'acc'], među: ['ins', 'acc'], uz: ['acc'], niz: ['acc'] }),
  and: ['i', 'и', 'a', 'а', 'ili', 'или', 'pa', 'па'], copulas: ['je', 'је', 'su', 'су', 'sam', 'сам', 'si', 'си', 'smo', 'смо', 'ste', 'сте', 'bio', 'био', 'bila', 'била', 'bilo', 'било', 'bili', 'били', 'biti', 'бити'],
  pronounPerson: both({ ja: '1', ti: '2', on: '3', ona: '3', ono: '3', mi: '1', vi: '2', oni: '3', one: '3' }),
  script: { prefixOf: stripSh, strip: stripSh, hasMarks: hasMarksSh },
  codes: CODES, voice: { espeak: 'hr' }, address: [],
});
