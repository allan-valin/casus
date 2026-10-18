/* Mirror of tools/casus_build/ar/normalize.py (fixture tests/fixtures/ar.strip.json): the bare letters. */
const MARKS = /[ً-ٰٟـۖ-ۭ]/g;
const FOLD = { أ: 'ا', إ: 'ا', آ: 'ا', ٱ: 'ا', ى: 'ي' };
export function stripAr(s) {
  return s.normalize('NFC').replace(MARKS, '').replace(/[أإآٱى]/g, (c) => FOLD[c]);
}
/** the letters with only the vowel marks gone (no folding) */
export const lettersOf = (s) => s.normalize('NFC').replace(MARKS, '');
/** a spelling the text may stand for: the same letters, or — when the text writes no hamza — the same folded letters */
export function keepsAr(input, key) {
  const a = lettersOf(input);
  if (a === lettersOf(key)) return true;
  return !/[أإآؤئءٱ]/.test(a) && stripAr(a) === stripAr(key);
}
export const hasMarksAr = (s) => /[ً-ْٰ]/.test(s);
