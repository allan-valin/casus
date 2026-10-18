/*
 * Latin's inventory: what a block can carry (spec 2026-10-18 §4). The primary channel owns the
 * hue; the others ride on border style, badge and markers. `codes` are the format-2 tables the
 * shards use (mirrored in tools/casus_build/shard.py).
 */
import { LATIN_CODES } from '../../lib/lexicon.js';
import { LATIN_AGREEMENT } from '../../lib/disambiguate.js';

export const LATIN_INVENTORY = {
  primary: 'case',
  channels: {
    case: {
      values: ['nom', 'voc', 'gen', 'dat', 'acc', 'abl', 'loc'],
      badge: { nom: 'Nm', voc: 'Vc', gen: 'Gn', dat: 'Dt', acc: 'Ac', abl: 'Ab', loc: 'Lc' },
      name: {
        en: { nom: 'nominative', voc: 'vocative', gen: 'genitive', dat: 'dative', acc: 'accusative', abl: 'ablative', loc: 'locative' },
        pt: { nom: 'nominativo', voc: 'vocativo', gen: 'genitivo', dat: 'dativo', acc: 'acusativo', abl: 'ablativo', loc: 'locativo' },
      },
      // the hue order follows the validated six; a seventh value shares a hue and takes a border
      hueOrder: ['nom', 'gen', 'dat', 'acc', 'abl', 'voc'],
      sharesHueOf: { loc: 'abl' },
      border: { loc: 'double' },
    },
    number: { values: ['sg', 'pl'], border: { pl: 'dashed' }, name: { en: { sg: 'singular', pl: 'plural' }, pt: { sg: 'singular', pl: 'plural' } } },
    gender: { values: ['m', 'f', 'n', 'c'], name: { en: { m: 'masculine', f: 'feminine', n: 'neuter', c: 'common' }, pt: { m: 'masculino', f: 'feminino', n: 'neutro', c: 'comum' } } },
  },
  families: { nominal: ['noun', 'adj', 'pron', 'num', 'vpar', 'supine'], verb: ['verb'], function: '*' },
  agreement: LATIN_AGREEMENT,
  codes: LATIN_CODES,
};
