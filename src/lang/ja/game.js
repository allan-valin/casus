/* The kana drill (Allan, 2026-10-18: like kana-quiz — sound first, every row ticked, all at once): each kana is a
 * pair (hiragana as `lower`, katakana as `upper`), so hiragana rows and katakana rows are separate groups, like the
 * Greek small letters and capitals. Answers are romaji; the usual alternatives count (shi/si, tsu/tu, fu/hu…). */
import { makeAlphabetGame } from '../../lib/alphabet.js';
import { kanaToRomaji, toHiragana } from './romanize.js';

const ALT = { し: ['si'], ち: ['ti'], つ: ['tu'], ふ: ['hu'], じ: ['zi'], ぢ: ['di', 'zi'], づ: ['du'], を: ['wo'], ん: ['nn'], ぢ_: [] };
const BASIC = [
  ['a', 'あいうえお'], ['ka', 'かきくけこ'], ['sa', 'さしすせそ'], ['ta', 'たちつてと'], ['na', 'なにぬねの'],
  ['ha', 'はひふへほ'], ['ma', 'まみむめも'], ['ya', 'やゆよ'], ['ra', 'らりるれろ'], ['wa', 'わをん'],
];
const VOICED = [['ga', 'がぎぐげご'], ['za', 'ざじずぜぞ'], ['da', 'だぢづでど'], ['ba', 'ばびぶべぼ'], ['pa', 'ぱぴぷぺぽ']];
const kata = (h) => [...h].map((c) => String.fromCodePoint(c.codePointAt(0) + 0x60)).join('');

const letter = (h, row, extra = false) => {
  const r = kanaToRomaji(h);
  return { lower: h, upper: kata(h), names: [], sounds: [r, ...(ALT[h] ?? [])], row, spoken: h, extra };
};
export const LETTERS = [
  ...BASIC.flatMap(([row, ks]) => [...ks].map((h) => letter(h, row))),
  ...VOICED.flatMap(([row, ks]) => [...ks].map((h) => letter(h, row, true))),
];
const ROW_IDS = [...BASIC, ...VOICED].map(([row]) => row);
export const ROWS = [
  ...ROW_IDS.map((id) => ({ id, items: LETTERS.filter((l) => l.row === id).map((l) => ({ glyph: l.lower, letter: l })) })),
  ...ROW_IDS.map((id) => ({ id: `${id}-kata`, capital: true, items: LETTERS.filter((l) => l.row === id).map((l) => ({ glyph: l.upper, letter: l })) })),
];
export const { createGame, createGrid } = makeAlphabetGame(ROWS);
export const LABELS = { small: 'hiragana', capital: 'katakana' };
export { toHiragana };
