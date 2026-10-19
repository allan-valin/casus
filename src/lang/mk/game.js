/* The Macedonian Cyrillic drill: 31 letters, small and capital, by sound or by name. */
import { makeAlphabetGame } from '../../lib/alphabet.js';
import { romanizeMk } from './romanize.js';

const ROWS_OF = ['абвгд', 'ѓежзѕ', 'ијклљ', 'мнњоп', 'рстќу', 'фхцчџш'];
const NAMES = { ѓ: ['gje', 'ǵe'], ѕ: ['dze'], ј: ['je', 'jot'], љ: ['lje'], њ: ['nje'], ќ: ['kje', 'ḱe'], џ: ['dže', 'dzhe'] };
const ALT = { ѓ: ['gj', 'gy'], ж: ['zh'], ѕ: ['dz'], ќ: ['kj', 'ky'], ч: ['ch'], џ: ['dzh', 'dž'], ш: ['sh'], х: ['h', 'kh'], ц: ['ts', 'c'] };
export const LETTERS = ROWS_OF.flatMap((row) => [...row].map((ch) => {
  const r = romanizeMk(ch);
  return { lower: ch, upper: ch.toUpperCase(), names: NAMES[ch] ?? [r + (/[aeiou]/.test(r) ? '' : 'e')], sounds: [r, ...(ALT[ch] ?? [])], row: row[0], spoken: ch };
}));
const IDS = ROWS_OF.map((r) => r[0]);
export const ROWS = [
  ...IDS.map((id) => ({ id, items: LETTERS.filter((l) => l.row === id).map((l) => ({ glyph: l.lower, letter: l })) })),
  ...IDS.map((id) => ({ id: id.toUpperCase(), capital: true, items: LETTERS.filter((l) => l.row === id).map((l) => ({ glyph: l.upper, letter: l })) })),
];
export const { createGame, createGrid } = makeAlphabetGame(ROWS);
