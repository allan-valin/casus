/* German's inventory (docs/languages/de.md). Four cases on the hue in school order; number on the border;
 * gender shown on every noun as its article (showArticle); declension type in the class sub-layer. */
import CODES from './codes.js';

function layoutPairs(json) {
  const LAYOUT = {};
  for (const [pos, names] of Object.entries(json.LAYOUT)) LAYOUT[pos] = names.map((n) => [n, json.TABLES[n]]);
  return { POS: json.POS, LAYOUT, json };
}

export const GERMAN_INVENTORY = {
  primary: 'case',
  channels: {
    case: {
      values: ['nom', 'gen', 'dat', 'acc'],
      badge: { nom: 'Nm', gen: 'Gn', dat: 'Dt', acc: 'Ac' },
      name: {
        en: { nom: 'nominative', gen: 'genitive', dat: 'dative', acc: 'accusative' },
        pt: { nom: 'nominativo', gen: 'genitivo', dat: 'dativo', acc: 'acusativo' },
      },
      hueOrder: ['nom', 'gen', 'dat', 'acc'],
    },
    number: { values: ['sg', 'pl'], border: { pl: 'dashed' }, name: { en: { sg: 'singular', pl: 'plural' }, pt: { sg: 'singular', pl: 'plural' } } },
    gender: { values: ['m', 'f', 'n'], name: { en: { m: 'masculine', f: 'feminine', n: 'neuter' }, pt: { m: 'masculino', f: 'feminino', n: 'neutro' } } },
  },
  families: { nominal: ['noun', 'adj', 'pron', 'det', 'num'], verb: ['verb'], function: '*' },
  agreement: { targets: ['adj', 'det', 'pron'], witnesses: ['noun', 'pron', 'det'] },
  showArticle: true,
  codes: layoutPairs(CODES),
};
