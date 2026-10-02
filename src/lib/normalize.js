/**
 * Lowercase, strip diacritics, fold j->i and v->u. Lookup keys only.
 * Must stay identical to tools/casus_build/normalize.py; the shared fixture
 * tests/fixtures/normalization.json is run against both.
 */
export function normalizeForm(s) {
  return s
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .replaceAll('j', 'i')
    .replaceAll('v', 'u');
}
