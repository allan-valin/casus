/* Ancient Greek's inventory (docs/languages/grc.md). Five cases on the hue; number on the border
 * (dual double, plural dashed); gender in the class sub-layer. The article (det) is both a target and
 * the strongest agreement witness. `codes` mirrors tools/casus_build/grc/codes.py (fixture-checked). */
import CODES from './codes.json';

function layoutPairs(json) {
  const LAYOUT = {};
  for (const [pos, names] of Object.entries(json.LAYOUT)) LAYOUT[pos] = names.map((n) => [n, json.TABLES[n]]);
  return { POS: json.POS, LAYOUT, json };
}

export const GREEK_INVENTORY = {
  primary: 'case',
  channels: {
    case: {
      values: ['nom', 'gen', 'dat', 'acc', 'voc'],
      badge: { nom: 'Nm', gen: 'Gn', dat: 'Dt', acc: 'Ac', voc: 'Vc' },
      name: {
        en: { nom: 'nominative', gen: 'genitive', dat: 'dative', acc: 'accusative', voc: 'vocative' },
        pt: { nom: 'nominativo', gen: 'genitivo', dat: 'dativo', acc: 'acusativo', voc: 'vocativo' },
      },
      hueOrder: ['nom', 'gen', 'dat', 'acc', 'voc'],
    },
    number: {
      values: ['sg', 'du', 'pl'], border: { du: 'double', pl: 'dashed' },
      name: { en: { sg: 'singular', du: 'dual', pl: 'plural' }, pt: { sg: 'singular', du: 'dual', pl: 'plural' } },
    },
    gender: { values: ['m', 'f', 'n', 'c'], name: { en: { m: 'masculine', f: 'feminine', n: 'neuter', c: 'common' }, pt: { m: 'masculino', f: 'feminino', n: 'neutro', c: 'comum' } } },
  },
  families: { nominal: ['noun', 'adj', 'pron', 'det', 'num', 'vpar'], verb: ['verb'], function: '*' },
  agreement: { targets: ['adj', 'vpar', 'pron', 'det'], witnesses: ['noun', 'pron', 'det'] },
  codes: layoutPairs(CODES),
};
