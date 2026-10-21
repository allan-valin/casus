/* Lithuanian (2026-10-21; docs/languages/lt.md): seven cases, prepositions with theirs; dictionary tone marks folded. */
import { makeCaseLanguage } from '../caseLanguage.js';
import CODES from './codes.js';
import { stripLt, hasMarksLt } from './script.js';

const C = (id, badge, en, pt) => ({ id, badge, en, pt });
export const lithuanian = makeCaseLanguage({
  code: 'lt', name: { en: 'Lithuanian', pt: 'Lituano' }, inText: { en: 'Lithuanian', pt: 'lituano' }, bcp47: 'lt', wiktionary: 'Lithuanian',
  cases: [C('nom', 'Nm', 'nominative (vardininkas)', 'nominativo'), C('gen', 'Gn', 'genitive (kilmininkas)', 'genitivo'), C('dat', 'Dt', 'dative (naudininkas)', 'dativo'),
    C('acc', 'Ac', 'accusative (galininkas)', 'acusativo'), C('ins', 'In', 'instrumental (įnagininkas)', 'instrumental'), C('loc', 'Lc', 'locative (vietininkas)', 'locativo'), C('voc', 'Vc', 'vocative (šauksmininkas)', 'vocativo')],
  hues: ['nom', 'gen', 'dat', 'acc', 'ins', 'loc'], shares: { voc: 'nom' }, borders: { voc: 'dotted' },
  government: { į: ['acc'], iš: ['gen'], be: ['gen'], dėl: ['gen'], iki: ['gen'], nuo: ['gen'], prie: ['gen'], už: ['gen', 'acc'], po: ['gen', 'ins', 'acc'],
    pas: ['acc'], per: ['acc'], pro: ['acc'], prieš: ['acc'], apie: ['acc'], pagal: ['acc'], link: ['gen'], virš: ['gen'], tarp: ['gen'], ant: ['gen'],
    ties: ['ins'], su: ['ins'], šalia: ['gen'], vietoj: ['gen'], dėka: ['gen'], palei: ['acc'], skersai: ['gen'] },
  and: ['ir', 'bei', 'arba', 'o', 'bet'], copulas: ['yra', 'esu', 'esi', 'esame', 'esate', 'buvo', 'buvau', 'buvai', 'bus', 'būti'],
  pronounPerson: { aš: '1', tu: '2', jis: '3', ji: '3', mes: '1', jūs: '2', jie: '3', jos: '3' },
  script: { prefixOf: stripLt, strip: stripLt, hasMarks: hasMarksLt },
  codes: CODES, voice: { espeak: 'lt' }, address: [],
});
