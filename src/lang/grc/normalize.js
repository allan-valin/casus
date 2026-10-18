/* Ancient Greek lookup keys (docs/languages/grc.md §7), mirrored by tools/casus_build/grc/normalize.py.
 * normalizeGrc: NFD, lower case, final sigma → σ, length marks dropped, every other diacritic kept, NFC.
 * stripGrc: every combining mark dropped — the second key, for unaccented input.
 * A mismatch with the Python side is silent total lookup failure: the fixture checks both. */
const COMBINING = /[̀-ͯ]/g;
const LENGTH = /[̄̆]/g;

export function normalizeGrc(s) {
  return s.normalize('NFD').toLowerCase().replace(/ς/g, 'σ').replace(LENGTH, '').replace(/\u0300/g, '\u0301').normalize('NFC');
}

export function stripGrc(s) {
  return s.normalize('NFD').toLowerCase().replace(/ς/g, 'σ').replace(COMBINING, '');
}

export function hasMarks(s) {
  return /[̀-̃̅̇-ͯ]/.test(s.normalize('NFD'));
}
