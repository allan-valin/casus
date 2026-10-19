/* Russian: six cases on the six hues, plural on the border; gender in the dictionary form. */
import CODES from './codes.js';

function layoutPairs(json) {
  const LAYOUT = {};
  for (const [pos, names] of Object.entries(json.LAYOUT)) LAYOUT[pos] = names.map((n) => [n, json.TABLES[n]]);
  return { POS: json.POS, LAYOUT, json };
}

export const RUSSIAN_INVENTORY = {
  primary: 'case',
  channels: {
    case: {
      values: ['nom', 'gen', 'dat', 'acc', 'ins', 'pre'],
      badge: { nom: 'Nm', gen: 'Gn', dat: 'Dt', acc: 'Ac', ins: 'In', pre: 'Pr' },
      name: {
        en: { nom: 'nominative', gen: 'genitive', dat: 'dative', acc: 'accusative', ins: 'instrumental', pre: 'prepositional' },
        pt: { nom: 'nominativo', gen: 'genitivo', dat: 'dativo', acc: 'acusativo', ins: 'instrumental', pre: 'preposicional' },
      },
    },
    number: { values: ['sg', 'pl'], border: { pl: 'dashed' }, name: { en: { sg: 'singular', pl: 'plural' }, pt: { sg: 'singular', pl: 'plural' } } },
    gender: { values: ['m', 'f', 'n'], name: { en: { m: 'masculine', f: 'feminine', n: 'neuter' }, pt: { m: 'masculino', f: 'feminino', n: 'neutro' } } },
  },
  families: { nominal: ['noun', 'adj', 'pron', 'det', 'num'], verb: ['verb'], function: '*' },
  agreement: { targets: ['adj', 'det'], witnesses: ['noun', 'pron'] },
  codes: layoutPairs(CODES),
};
