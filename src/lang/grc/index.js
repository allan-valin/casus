/* Ancient Greek (docs/languages/grc.md; languages plan Task 12). */
import { governmentStage, agreementStage } from '../../lib/disambiguate.js';
import { WORD_ORDERS } from '../../app/lib/order.js';
import { normalizeGrc, stripGrc, hasMarks } from './normalize.js';
import { segment } from './segment.js';
import { tokenize } from './tokenize.js';
import { GOVERNMENT } from './prepositions.js';
import { GREEK_INVENTORY } from './inventory.js';
import { prepositionSettledStage, makeVocativeStage, makeCoordinationStage, makeNumberStage, makeRelativeStage } from '../../lib/classical.js';
import { normalizeGrc as nG } from './normalize.js';
import { GREEK_ERAS } from './eras.js';
import { ROWS, LETTERS, createGame, createGrid } from './game.js';

const gov = (blocks) => governmentStage(blocks, GOVERNMENT);
const agr = (blocks) => agreementStage(blocks, GREEK_INVENTORY);

export const greek = {
  code: 'grc',
  name: { en: 'Ancient Greek', pt: 'Grego antigo' },
  inText: { en: 'Ancient Greek', pt: 'grego antigo' },
  bcp47: 'grc',
  wiktionary: 'Ancient Greek',
  sources: { en: 'Wiktionary', pt: 'Wikcionário', full: { en: 'the English Wiktionary', pt: 'o Wiktionary em inglês' } },
  script: { normalize: normalizeGrc, rtl: false, spaced: true, prefixOf: stripGrc, strip: stripGrc, hasMarks },
  inventory: GREEK_INVENTORY,
  segment,
  tokenize,
  stages: [gov, agr, gov, prepositionSettledStage, makeVocativeStage(['ὦ', 'ὤ']), makeCoordinationStage(['καί', 'τε', 'ἠδέ']), makeNumberStage({ conjunctions: ['καί', 'τε', 'ἠδέ', 'ἤ'], neuterPluralTakesSingular: true }),
    makeRelativeStage(['ὅς', 'ἥ', 'ὅ', 'οὗ', 'ἧς', 'ᾧ', 'ᾗ', 'ὅν', 'ἥν', 'οἵ', 'αἵ', 'ἅ', 'ὧν', 'οἷς', 'αἷς', 'οὕς', 'ἅς'].map(nG)), gov, agr, gov],
  government: GOVERNMENT,
  arrange: WORD_ORDERS,
  eras: GREEK_ERAS,
  dataPath: '/data/grc',
  samplesPath: '/samples/grc',
  voice: { espeak: 'grc' },
  game: { ROWS, LETTERS, createGame, createGrid },
};
