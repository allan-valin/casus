/* Helpers for the dictionary entry (languages design §6). */

/** The IPA variant whose tags match the period's preferred tags, else the first; null when none. */
export function pickIpa(variants, preferred = []) {
  if (!variants?.length) return null;
  for (const tag of preferred) {
    const hit = variants.find((v) => v.tags.includes(tag));
    if (hit) return hit;
  }
  return variants[0];
}

/** A lookup key written for reading: Greek keys carry σ everywhere, the page writes final ς. */
export function displayForm(key) {
  return key.replace(/σ(?=$|[\s\p{P}])/gu, 'ς');
}

/** Supplied spellings for a pill: up to three, then a count. */
export function suppliedLabel(forms, max = 3) {
  const shown = forms.slice(0, max).map(displayForm).join(' / ');
  return forms.length > max ? `${shown} +${forms.length - max}` : shown;
}

/** Wiktionary page of a headword, at the language's section; `edition` en or pt. */
export function wiktionaryUrl(headword, languageSection, edition = 'en') {
  const word = encodeURIComponent(headword);
  if (edition === 'pt') return `https://pt.wiktionary.org/wiki/${word}`;
  return `https://en.wiktionary.org/wiki/${word}#${languageSection.replace(/ /g, '_')}`;
}
