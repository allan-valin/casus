/* The Cyrillic alphabet drill: small letters and capitals as separate rows, answered by sound or by name. */
import { makeAlphabetGame } from '../../lib/alphabet.js';

const L = (lower, names, sounds, row) => ({ lower, upper: lower.toUpperCase(), names, sounds, row, spoken: lower });
export const LETTERS = [
  L('а', ['a'], ['a'], 'а-д'), L('б', ['be', 'bɛ'], ['b'], 'а-д'), L('в', ['ve'], ['v'], 'а-д'), L('г', ['ge'], ['g'], 'а-д'), L('д', ['de'], ['d'], 'а-д'),
  L('е', ['je', 'ye'], ['je', 'ye', 'e'], 'е-й'), L('ё', ['jo', 'yo'], ['jo', 'yo'], 'е-й'), L('ж', ['zhe', 'že'], ['zh', 'ž'], 'е-й'), L('з', ['ze'], ['z'], 'е-й'),
  L('и', ['i'], ['i'], 'е-й'), L('й', ['i kratkoye', 'short i', 'j'], ['j', 'y', 'i'], 'е-й'),
  L('к', ['ka'], ['k'], 'к-п'), L('л', ['el'], ['l'], 'к-п'), L('м', ['em'], ['m'], 'к-п'), L('н', ['en'], ['n'], 'к-п'), L('о', ['o'], ['o'], 'к-п'), L('п', ['pe'], ['p'], 'к-п'),
  L('р', ['er'], ['r'], 'р-х'), L('с', ['es'], ['s'], 'р-х'), L('т', ['te'], ['t'], 'р-х'), L('у', ['u'], ['u'], 'р-х'), L('ф', ['ef'], ['f'], 'р-х'), L('х', ['kha', 'xa', 'ha'], ['kh', 'x', 'h'], 'р-х'),
  L('ц', ['tse', 'ce'], ['ts', 'c'], 'ц-щ'), L('ч', ['che', 'če'], ['ch', 'č'], 'ц-щ'), L('ш', ['sha', 'ša'], ['sh', 'š'], 'ц-щ'), L('щ', ['shcha', 'šča'], ['shch', 'šč', 'sch'], 'ц-щ'),
  L('ъ', ['tvyordy znak', 'hard sign'], ['ʺ', '"', 'hard'], 'ъ-я'), L('ы', ['y', 'yery'], ['y', 'ы'], 'ъ-я'), L('ь', ['myagky znak', 'soft sign'], ['ʹ', "'", 'soft'], 'ъ-я'),
  L('э', ['e', 'e oborotnoye'], ['e'], 'ъ-я'), L('ю', ['ju', 'yu'], ['ju', 'yu'], 'ъ-я'), L('я', ['ja', 'ya'], ['ja', 'ya'], 'ъ-я'),
];
const IDS = ['а-д', 'е-й', 'к-п', 'р-х', 'ц-щ', 'ъ-я'];
export const ROWS = [
  ...IDS.map((id) => ({ id, items: LETTERS.filter((l) => l.row === id).map((l) => ({ glyph: l.lower, letter: l })) })),
  ...IDS.map((id) => ({ id: id.toUpperCase(), capital: true, items: LETTERS.filter((l) => l.row === id).map((l) => ({ glyph: l.upper, letter: l })) })),
];
export const { createGame, createGrid } = makeAlphabetGame(ROWS);
