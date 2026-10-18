/* German (docs/languages/de.md; languages phase 3). */
import { governmentStage } from '../../lib/disambiguate.js';
import { WORD_ORDERS } from '../../app/lib/order.js';
import { segment } from './segment.js';
import { tokenize } from './tokenize.js';
import { GOVERNMENT } from './prepositions.js';
import { GERMAN_INVENTORY } from './inventory.js';
import { phraseStage } from './phrase.js';
import { clauseStage } from './clause.js';

const gov = (blocks) => governmentStage(blocks, GOVERNMENT, { phrase: true });

export const german = {
  code: 'de',
  name: { en: 'German', pt: 'Alemão' },
  inText: { en: 'German', pt: 'alemão' },
  bcp47: 'de',
  wiktionary: 'German',
  sources: { en: 'Wiktionary', pt: 'Wikcionário', full: { en: 'the English Wiktionary', pt: 'o Wiktionary em inglês' } },
  script: { normalize: (s) => s.normalize('NFC'), rtl: false, spaced: true, prefixOf: (f) => f.toLowerCase() },
  inventory: GERMAN_INVENTORY,
  segment,
  tokenize,
  // government, then the noun-phrase rules (NP1–NP3), then government again with the settled phrases;
  // the sentence-wide agreement stage is not used: German agreement lives inside the phrase
  stages: [gov, phraseStage, gov, phraseStage, clauseStage, phraseStage, clauseStage, gov],
  government: GOVERNMENT,
  governmentPhrase: true,
  arrange: WORD_ORDERS,
  eras: [{ id: 'modern', label: 'Present-day standard German', authors: 'reform spelling (1996/2006)', ages: [], ipa: [] }],
  dataPath: '/data/de',
  samplesPath: '/samples/de',
  voice: { espeak: 'de', natural: { voiceId: 'de_DE-thorsten-medium', name: 'Thorsten', sizeMB: 63 } },
};
