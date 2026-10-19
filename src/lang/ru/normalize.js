/* Mirror of tools/casus_build/ru/normalize.py (fixture tests/fixtures/ru.strip.json): lower case, no stress, ё → е. */
export function stripRu(s) {
  return s.toLowerCase().normalize('NFD').replace(/[́̀̈]/g, '').normalize('NFC');
}
export const hasMarksRu = (s) => /[́̀ё]/i.test(s.normalize('NFD').replace(/ё/gi, 'ё'));
