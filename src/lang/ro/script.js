/* Romanian keys (2026-10-21): lower case, the old cedilla letters ş ţ folded into the comma ones ș ț that the
 * dictionary uses (texts mix both). Mirror of tools/casus_build/generic.py _key_ro. */
export const stripRo = (s) => s.toLowerCase().replace(/ş/g, 'ș').replace(/ţ/g, 'ț').normalize('NFC');
export const hasMarksRo = (s) => /[şţŞŢ]/.test(s);
