/*
 * Arabic IPA from the vowelled spelling, for words Wiktionary gives no transcription (Allan 2026-10-28: مُعَلِّمَة had
 * none, so the pronunciation compare skipped it). Built on the romanizer's letters; case endings are dropped as a
 * word said alone (pausal form), the way Wiktionary writes it: مُعَلِّمٌ → muʕallim. Checked against the Wiktionary
 * IPA of the dictionary's headwords (tests/lang/ar.ipa.test.js).
 */
import { romanizeAr } from './romanize.js';

const IPA = { ṯ: 'θ', j: 'd͡ʒ', ḥ: 'ħ', ḵ: 'x', ḏ: 'ð', š: 'ʃ', ṣ: 'sˤ', ḍ: 'dˤ', ṭ: 'tˤ', ẓ: 'ðˤ', ḡ: 'ɣ', y: 'j', ā: 'aː', ī: 'iː', ū: 'uː', '-': '' };
const CASE = /[ٌٍُِ]+$/u;            // -un, -in, -u, -i at the end; -an stays, as Wiktionary writes it (مَرْحَبًا marħaban)
const MARKS = /[ً-ْٰ]/u;

/** the pausal IPA of one vowelled Arabic word, or null when the word carries too few vowel marks to tell */
export function ipaAr(word, { pausal = true } = {}) {
  let w = word.normalize('NFC').replace(/ـ/g, '');
  if (!MARKS.test(w)) return null;
  if (pausal) w = w.replace(CASE, '');   // inside a sentence the endings are said, as written
  let latin = romanizeAr(w).replace(/ā?an$/u, 'an');                 // the alif that carries -an is not a long vowel
  if (/^ا[َُِ]/u.test(w)) latin = latin.replace(/^a(?=[aiu])/u, '');  // a connecting alif: اِسْم ism, not aism
  return [...latin].map((c) => IPA[c] ?? c).join('');
}
