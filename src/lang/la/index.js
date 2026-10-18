/* Latin: the first language definition (spec 2026-10-18 §4). Everything the page and the parser
 * need that differs between languages, in one object. */
import { segment } from '../../lib/segment.js';
import { tokenize } from '../../lib/tokenize.js';
import { normalizeForm } from '../../lib/normalize.js';
import { GOVERNMENT } from '../../lib/prepositions.js';
import { LATIN_STAGES } from '../../lib/disambiguate.js';
import { ERAS } from '../../app/lib/era.js';
import { WORD_ORDERS } from '../../app/lib/order.js';
import { LATIN_INVENTORY } from './inventory.js';

export const latin = {
  code: 'la',
  name: { en: 'Latin', pt: 'Latim' },
  bcp47: 'la',
  wiktionary: 'Latin',
  script: { normalize: normalizeForm, rtl: false, spaced: true },
  inventory: LATIN_INVENTORY,
  segment,
  tokenize,
  stages: LATIN_STAGES,
  government: GOVERNMENT,
  arrange: WORD_ORDERS,
  eras: ERAS,
  dataPath: '/data/la',
  samplesPath: '/samples/la',
  voice: { espeak: 'la' },
};
