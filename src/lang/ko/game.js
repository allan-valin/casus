/* The Hangul drill: consonants and vowels (jamo) alone, and as a syllable block (consonant + ㅏ, ㅇ + vowel), answered
 * by sound (Revised Romanization) or by name. */
import { makeAlphabetGame } from '../../lib/alphabet.js';

const syl = (i, v) => String.fromCodePoint(0xac00 + (i * 21 + v) * 28);
const CONS = [['ㄱ', 0, ['giyeok', 'kiyeok'], ['g', 'k']], ['ㄴ', 2, ['nieun'], ['n']], ['ㄷ', 3, ['digeut', 'tikeut'], ['d', 't']], ['ㄹ', 5, ['rieul'], ['r', 'l']],
  ['ㅁ', 6, ['mieum'], ['m']], ['ㅂ', 7, ['bieup', 'pieup'], ['b', 'p']], ['ㅅ', 9, ['siot'], ['s']], ['ㅇ', 11, ['ieung'], ['ng', '-', 'silent', '']],
  ['ㅈ', 12, ['jieut', 'chieut'], ['j']], ['ㅊ', 14, ['chieut'], ['ch']], ['ㅋ', 15, ['kieuk'], ['k']], ['ㅌ', 16, ['tieut'], ['t']], ['ㅍ', 17, ['pieup'], ['p']],
  ['ㅎ', 18, ['hieut'], ['h']], ['ㄲ', 1, ['ssanggiyeok'], ['kk']], ['ㄸ', 4, ['ssangdigeut'], ['tt']], ['ㅃ', 8, ['ssangbieup'], ['pp']], ['ㅆ', 10, ['ssangsiot'], ['ss']], ['ㅉ', 13, ['ssangjieut'], ['jj']]];
const VOWS = [['ㅏ', 0, 'a'], ['ㅑ', 2, 'ya'], ['ㅓ', 4, 'eo'], ['ㅕ', 6, 'yeo'], ['ㅗ', 8, 'o'], ['ㅛ', 12, 'yo'], ['ㅜ', 13, 'u'], ['ㅠ', 17, 'yu'], ['ㅡ', 18, 'eu'], ['ㅣ', 20, 'i'],
  ['ㅐ', 1, 'ae'], ['ㅔ', 5, 'e'], ['ㅒ', 3, 'yae'], ['ㅖ', 7, 'ye'], ['ㅘ', 9, 'wa'], ['ㅙ', 10, 'wae'], ['ㅚ', 11, 'oe'], ['ㅝ', 14, 'wo'], ['ㅞ', 15, 'we'], ['ㅟ', 16, 'wi'], ['ㅢ', 19, 'ui']];
const row = (k, size, prefix) => `${prefix}${Math.floor(k / size) + 1}`;
export const LETTERS = [
  ...CONS.map(([j, i, names, sounds], k) => ({ lower: j, upper: syl(i, 0), names, sounds, row: row(k, 5, 'c'), spoken: syl(i, 0) })),
  ...VOWS.map(([j, v, r], k) => ({ lower: j, upper: syl(11, v), names: [r], sounds: [r], row: row(k, 5, 'v'), spoken: syl(11, v) })),
];
const IDS = [...new Set(LETTERS.map((l) => l.row))];
export const ROWS = [
  ...IDS.map((id) => ({ id, items: LETTERS.filter((l) => l.row === id).map((l) => ({ glyph: l.lower, letter: l })) })),
  ...IDS.map((id) => ({ id: `${id}-syl`, capital: true, items: LETTERS.filter((l) => l.row === id).map((l) => ({ glyph: l.upper, letter: l })) })),
];
export const { createGame, createGrid } = makeAlphabetGame(ROWS);
export const LABELS = { small: 'jamo', capital: 'in a syllable' };
