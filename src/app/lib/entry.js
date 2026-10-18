/* Helpers for the dictionary entry (languages design §6). */

/** The IPA variant whose tags match the period's preferred tags, else the first; null when none. */
export function pickIpa(variants, preferred = []) {
  if (!variants?.length) return null;
  return variants.find((v) => v.tags.some((t) => preferred.includes(t))) ?? variants[0];
}

/** Wiktionary page of a headword, at the language's section; `edition` en or pt. */
export function wiktionaryUrl(headword, languageSection, edition = 'en') {
  const word = encodeURIComponent(headword);
  if (edition === 'pt') return `https://pt.wiktionary.org/wiki/${word}`;
  return `https://en.wiktionary.org/wiki/${word}#${languageSection.replace(/ /g, '_')}`;
}
