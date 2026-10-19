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

/* Vowels the text writes against a reading's vowelled spelling (Allan, 2026-10-19: بِسْمِ was read as بَسَمَ "he
 * smiled"): letter by letter, a short vowel or sukun written on both must be the same, and a shadda the text writes must
 * be there. The last letter is left out (a noun's case vowel is the case rule's business) unless `last` (a verb's
 * spelling is complete). */
const VOWEL = /[ًٌٍَُِْ]/;
const SHADDA = 'ّ';
function syllables(s) {
  const out = [];
  for (const ch of s.normalize('NFC')) {
    if (/[ً-ٰٟـ]/.test(ch)) { if (out.length) out[out.length - 1].marks += ch; } else out.push({ letter: FOLD[ch] ?? ch, marks: '' });
  }
  return out;
}
export function vowelsAgree(text, spelling, { last = false } = {}) {
  if (!spelling) return true;
  const a = syllables(text);
  const b = syllables(spelling);
  if (a.length !== b.length) return true;              // different letters: another rule's business
  for (let i = 0; i < a.length - (last ? 0 : 1); i += 1) {
    const va = [...a[i].marks].find((m) => VOWEL.test(m));
    const vb = [...b[i].marks].find((m) => VOWEL.test(m));
    if (va && vb && va !== vb) return false;
    if (a[i].marks.includes(SHADDA) && b[i].marks && !b[i].marks.includes(SHADDA)) return false;
  }
  return true;
}
/** the vowel on the last letter as the text writes it: 'u' (ُ ٌ), 'i' (ِ ٍ), 'a' (َ ً) or null */
export function finalVowel(text) {
  const s = syllables(text);
  const m = s.length ? s[s.length - 1].marks : '';
  return /[ٌُ]/.test(m) ? 'u' : /[ٍِ]/.test(m) ? 'i' : /[ًَ]/.test(m) ? 'a' : null;
}
