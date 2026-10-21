/* Lithuanian keys (2026-10-21): lower case without the tone marks of dictionaries (acute, grave, tilde, and the dot
 * that keeps an accented i dotted); ą č ę ė į š ų ū ž stay letters. Mirror of tools/casus_build/lt.py strip_lt. */
export function stripLt(s) {
  const d = s.toLowerCase().normalize('NFD').replace(/[̀́̃]/g, '');
  return d.replace(/i̇/g, 'i').replace(/į̇/g, 'į').normalize('NFC');
}
export const hasMarksLt = (s) => /[̀́̃]/.test(s.normalize('NFD'));
