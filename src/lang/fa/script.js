/* Persian keys (2026-10-21): no short-vowel marks, Arabic ي ك folded into ی ک, the zero-width non-joiner dropped.
 * Mirror of tools/casus_build/fa.py strip_fa. */
export function stripFa(s) {
  return s.normalize('NFC').replace(/[ً-ْٰٕٔ]/g, '').replace(/ي/g, 'ی').replace(/ك/g, 'ک').replace(/ى/g, 'ی').replace(/‌/g, '').trim();
}
export const hasMarksFa = (s) => /[ً-ْٰ]/.test(s);
