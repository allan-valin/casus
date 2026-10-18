/* The Arabic alphabet drill: each letter alone (isolated) and joined inside a word (the medial form, or the final
 * form for the six letters that never join to the next), answered by sound or by name. */
import { makeAlphabetGame } from '../../lib/alphabet.js';

const NON_JOINING = new Set(['ا', 'د', 'ذ', 'ر', 'ز', 'و']);
const L = (ch, names, sounds, row) => ({ lower: ch, upper: NON_JOINING.has(ch) ? `ـ${ch}` : `ـ${ch}ـ`, names, sounds, row, spoken: ch });
export const LETTERS = [
  L('ا', ['alif'], ['a', 'ā', 'aa'], 'ا-ث'), L('ب', ['ba', 'baa', 'bāʾ'], ['b'], 'ا-ث'), L('ت', ['ta', 'taa', 'tāʾ'], ['t'], 'ا-ث'), L('ث', ['tha', 'thaa', 'ṯāʾ'], ['th', 'ṯ'], 'ا-ث'),
  L('ج', ['jim', 'jeem', 'jīm'], ['j'], 'ج-خ'), L('ح', ['ha', 'haa', 'ḥāʾ'], ['h', 'ḥ'], 'ج-خ'), L('خ', ['kha', 'khaa', 'ḵāʾ'], ['kh', 'ḵ', 'x'], 'ج-خ'),
  L('د', ['dal', 'daal', 'dāl'], ['d'], 'د-ز'), L('ذ', ['dhal', 'thal', 'ḏāl'], ['dh', 'ḏ'], 'د-ز'), L('ر', ['ra', 'raa', 'rāʾ'], ['r'], 'د-ز'), L('ز', ['zay', 'zayn', 'zāy'], ['z'], 'د-ز'),
  L('س', ['sin', 'seen', 'sīn'], ['s'], 'س-ض'), L('ش', ['shin', 'sheen', 'šīn'], ['sh', 'š'], 'س-ض'), L('ص', ['sad', 'saad', 'ṣād'], ['s', 'ṣ'], 'س-ض'), L('ض', ['dad', 'daad', 'ḍād'], ['d', 'ḍ'], 'س-ض'),
  L('ط', ['ta', 'taa', 'ṭāʾ'], ['t', 'ṭ'], 'ط-غ'), L('ظ', ['za', 'zaa', 'ẓāʾ'], ['z', 'ẓ', 'dh'], 'ط-غ'), L('ع', ['ayn', 'ain', 'ʕayn'], ["'", 'ʕ', 'ʿ', 'a'], 'ط-غ'), L('غ', ['ghayn', 'ghain', 'ḡayn'], ['gh', 'ḡ'], 'ط-غ'),
  L('ف', ['fa', 'faa', 'fāʾ'], ['f'], 'ف-ل'), L('ق', ['qaf', 'qaaf', 'qāf'], ['q'], 'ف-ل'), L('ك', ['kaf', 'kaaf', 'kāf'], ['k'], 'ف-ل'), L('ل', ['lam', 'laam', 'lām'], ['l'], 'ف-ل'),
  L('م', ['mim', 'meem', 'mīm'], ['m'], 'م-ي'), L('ن', ['nun', 'noon', 'nūn'], ['n'], 'م-ي'), L('ه', ['ha', 'haa', 'hāʾ'], ['h'], 'م-ي'), L('و', ['waw', 'waaw', 'wāw'], ['w', 'u', 'ū'], 'م-ي'), L('ي', ['ya', 'yaa', 'yāʾ'], ['y', 'i', 'ī'], 'م-ي'),
];
const IDS = ['ا-ث', 'ج-خ', 'د-ز', 'س-ض', 'ط-غ', 'ف-ل', 'م-ي'];
export const ROWS = [
  ...IDS.map((id) => ({ id, items: LETTERS.filter((l) => l.row === id).map((l) => ({ glyph: l.lower, letter: l })) })),
  ...IDS.map((id) => ({ id: `${id}-joined`, capital: true, items: LETTERS.filter((l) => l.row === id).map((l) => ({ glyph: l.upper, letter: l })) })),
];
export const { createGame, createGrid } = makeAlphabetGame(ROWS);
export const LABELS = { small: 'alone', capital: 'joined' };
