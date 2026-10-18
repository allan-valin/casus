/* Arabic (overnight plan 2026-10-19): the three cases on the hue, number on the border (dual double, plural
 * dashed), the state (definite, indefinite, construct) in the badge's tooltip via the dictionary. */
import CODES from './codes.js';

function layoutPairs(json) {
  const LAYOUT = {};
  for (const [pos, names] of Object.entries(json.LAYOUT)) LAYOUT[pos] = names.map((n) => [n, json.TABLES[n]]);
  return { POS: json.POS, LAYOUT, json };
}

export const ARABIC_INVENTORY = {
  primary: 'case',
  channels: {
    case: {
      values: ['nom', 'acc', 'gen'],
      badge: { nom: 'Nm', acc: 'Ac', gen: 'Gn' },
      name: { en: { nom: 'nominative (marfūʕ)', acc: 'accusative (manṣūb)', gen: 'genitive (majrūr)' }, pt: { nom: 'nominativo (marfūʕ)', acc: 'acusativo (manṣūb)', gen: 'genitivo (majrūr)' } },
      hueOrder: ['nom', 'gen', 'acc'],
    },
    number: { values: ['sg', 'du', 'pl'], border: { du: 'double', pl: 'dashed' }, name: { en: { sg: 'singular', du: 'dual', pl: 'plural' }, pt: { sg: 'singular', du: 'dual', pl: 'plural' } } },
    gender: { values: ['m', 'f'], name: { en: { m: 'masculine', f: 'feminine' }, pt: { m: 'masculino', f: 'feminino' } } },
  },
  families: { nominal: ['noun', 'adj', 'pron', 'num', 'ppl'], verb: ['verb'], function: '*' },
  agreement: { targets: ['adj'], witnesses: ['noun'] },
  codes: layoutPairs(CODES),
};
