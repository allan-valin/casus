/* The Devanagari drill: vowels and consonants, the consonant with ā as its second form, answered in IAST (or plain
 * letters: ś sh, ṣ sh, ṅ n…). */
import { makeAlphabetGame } from '../../lib/alphabet.js';
import { romanizeSa } from './script.js';

const VOWELS = ['अ', 'आ', 'इ', 'ई', 'उ', 'ऊ', 'ऋ', 'ए', 'ऐ', 'ओ', 'औ'];
const CONS = ['क', 'ख', 'ग', 'घ', 'ङ', 'च', 'छ', 'ज', 'झ', 'ञ', 'ट', 'ठ', 'ड', 'ढ', 'ण', 'त', 'थ', 'द', 'ध', 'न', 'प', 'फ', 'ब', 'भ', 'म', 'य', 'र', 'ल', 'व', 'श', 'ष', 'स', 'ह'];
const plain = (r) => r.normalize('NFD').replace(/[̀-ͯ]/g, '');
const ALT = { 'ś': ['sh'], 'ṣ': ['sh'], 'ṅ': ['n', 'ng'], 'ñ': ['n', 'ny'], 'ṛ': ['ri', 'r'] };
const sounds = (r) => [...new Set([r, plain(r), ...(ALT[r] ?? [])])];
export const LETTERS = [
  ...VOWELS.map((v, k) => ({ lower: v, upper: v, names: [], sounds: sounds(romanizeSa(v)), row: `v${Math.floor(k / 6) + 1}`, spoken: v })),
  ...CONS.map((c, k) => { const r = romanizeSa(`${c}्`); return { lower: c, upper: `${c}ा`, names: [], sounds: [...sounds(r), ...sounds(`${r}a`)], row: `c${Math.floor(k / 5) + 1}`, spoken: c }; }),
];
const IDS = [...new Set(LETTERS.map((l) => l.row))];
export const ROWS = [
  ...IDS.map((id) => ({ id, items: LETTERS.filter((l) => l.row === id).map((l) => ({ glyph: l.lower, letter: l })) })),
  ...IDS.filter((id) => id.startsWith('c')).map((id) => ({ id: `${id}-ā`, capital: true, items: LETTERS.filter((l) => l.row === id).map((l) => ({ glyph: l.upper, letter: { ...l, sounds: [...l.sounds.filter((s) => s.endsWith('a')).map((s) => `${s.slice(0, -1)}ā`), ...l.sounds.filter((s) => s.endsWith('a')).map((s) => `${s}a`)] } })) })),
];
export const { createGame, createGrid } = makeAlphabetGame(ROWS);
export const LABELS = { small: 'letter', capital: 'with ā' };
