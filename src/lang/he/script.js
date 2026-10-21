/* Hebrew keys (2026-10-21): the letters without vowel points or cantillation, the maqaf dropped — texts are written
 * without points. Mirror of tools/casus_build/he.py strip_he; the build also files every pointed form under its full
 * spelling (יִכְתֹּב → יכתוב). */
const POINTS = /[֑-ׇֽֿׁׂׅׄ]/g;
export function stripHe(s) {
  return s.normalize('NFC').replace(POINTS, '').replace(/־/g, '').trim();
}
export const hasMarksHe = (s) => /[֑-ׇ]/.test(s.replace(/[־׀׃׆]/g, ''));
