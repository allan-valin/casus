/* Hungarian (docs/languages/hu.md; overnight 2026-10-19): eighteen cases on six hues — grammatical (nominative,
 * accusative, dative), inner (in, out of, into), surface (on, off, onto), near (at, from, to) — the rest share the
 * dative's hue, each with its own border and badge. */
import { makeCaseLanguage } from '../caseLanguage.js';
import CODES from './codes.js';

const C = (id, badge, en, pt) => ({ id, badge, en, pt });
export const hungarian = makeCaseLanguage({
  code: 'hu', name: { en: 'Hungarian', pt: 'Húngaro' }, inText: { en: 'Hungarian', pt: 'húngaro' }, bcp47: 'hu', wiktionary: 'Hungarian',
  cases: [C('nom', 'Nom', 'nominative', 'nominativo'), C('acc', 'Acc', 'accusative (-t)', 'acusativo (-t)'), C('dat', 'Dat', 'dative (-nak/-nek)', 'dativo'),
    C('ine', 'Ine', 'inessive (-ban: in)', 'inessivo (em)'), C('ela', 'Ela', 'elative (-ból: out of)', 'elativo (de dentro)'), C('ill', 'Ill', 'illative (-ba: into)', 'ilativo (para dentro)'),
    C('sup', 'Sup', 'superessive (-on: on)', 'superessivo (sobre)'), C('del', 'Del', 'delative (-ról: off, about)', 'delativo (de cima, sobre)'), C('sub', 'Sub', 'sublative (-ra: onto)', 'sublativo (para cima)'),
    C('ade', 'Ade', 'adessive (-nál: at)', 'adessivo (junto a)'), C('abl', 'Abl', 'ablative (-tól: from)', 'ablativo (de junto)'), C('all', 'All', 'allative (-hoz: to)', 'alativo (para junto)'),
    C('ins', 'Ins', 'instrumental (-val: with)', 'instrumental (com)'), C('cau', 'Cau', 'causal-final (-ért: for)', 'causal (por)'), C('tra', 'Tra', 'translative (-vá: into, becoming)', 'translativo'),
    C('ter', 'Ter', 'terminative (-ig: until)', 'terminativo (até)'), C('ess', 'Ess', 'essive (-ul: as)', 'essivo (como)'), C('for', 'For', 'essive-formal (-ként: as)', 'essivo formal')],
  hues: ['nom', 'acc', 'dat', 'ine', 'sup', 'ade'],
  shares: { ela: 'ine', ill: 'ine', del: 'sup', sub: 'sup', abl: 'ade', all: 'ade', ins: 'dat', cau: 'dat', tra: 'dat', ter: 'dat', ess: 'dat', for: 'dat' },
  borders: { ela: 'double', ill: 'dotted', del: 'double', sub: 'dotted', abl: 'double', all: 'dotted', ins: 'double', cau: 'dotted', tra: 'groove', ter: 'ridge', ess: 'inset', for: 'outset' },
  and: ['és', 'vagy', 'meg'], copulas: ['van', 'vannak', 'volt', 'voltak'],
  codes: CODES, voice: { espeak: 'hu', natural: { voiceId: 'hu_HU-anna-medium', name: 'Anna', sizeMB: 63 } }, address: [],
});
