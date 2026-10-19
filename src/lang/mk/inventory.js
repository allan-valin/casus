/* Macedonian (overnight plan 2026-10-19): no cases — the article is a suffix, and its three forms are what a learner
 * must see: -от/-та/-то (the), -ов/-ва/-во (this, near me), -он/-на/-но (that, over there). The colour is the article;
 * plural on the border. */
import CODES from './codes.js';

function layoutPairs(json) {
  const LAYOUT = {};
  for (const [pos, names] of Object.entries(json.LAYOUT)) LAYOUT[pos] = names.map((n) => [n, json.TABLES[n]]);
  return { POS: json.POS, LAYOUT, json };
}

export const MACEDONIAN_INVENTORY = {
  primary: 'case',
  channels: {
    case: {
      values: ['indef', 'def', 'prox', 'dist', 'voc'],
      badge: { indef: 'Ind', def: 'Def', prox: 'Prox', dist: 'Dist', voc: 'Voc' },
      name: {
        en: { indef: 'indefinite (no article)', def: 'definite -от/-та/-то (the)', prox: 'near -ов/-ва/-во (this)', dist: 'far -он/-на/-но (that)', voc: 'vocative' },
        pt: { indef: 'indefinido (sem artigo)', def: 'definido -от/-та/-то (o, a)', prox: 'perto -ов/-ва/-во (este)', dist: 'longe -он/-на/-но (aquele)', voc: 'vocativo' },
      },
      hueOrder: ['def', 'prox', 'dist', 'indef', 'voc'],
    },
    number: { values: ['sg', 'pl'], border: { pl: 'dashed' }, name: { en: { sg: 'singular', pl: 'plural' }, pt: { sg: 'singular', pl: 'plural' } } },
    gender: { values: ['m', 'f', 'n'], name: { en: { m: 'masculine', f: 'feminine', n: 'neuter' }, pt: { m: 'masculino', f: 'feminino', n: 'neutro' } } },
  },
  families: { nominal: ['noun', 'adj', 'pron', 'det', 'num'], verb: ['verb'], function: '*' },
  agreement: { targets: [], witnesses: [] },
  formBadge: null,
  codes: layoutPairs(CODES),
};
