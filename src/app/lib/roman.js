/* Latin letters for a language's own script (Allan, 2026-10-18/19): only text written in another script gets
 * them, so an English meaning beside a Greek word is left alone. */
const OTHER_SCRIPT = /[^\p{Script=Latin}\p{Script=Common}\p{Script=Inherited}]/u;
export function romanOf(text, romanize) {
  if (!romanize || !text || !OTHER_SCRIPT.test(text)) return '';
  const out = romanize(text);
  // a romaniser that cannot read the script (Japanese kanji have no reading without the dictionary) leaves it as it
  // was: show nothing rather than the same text again (Allan, 2026-10-19: the romaji repeated the kanji)
  return OTHER_SCRIPT.test(out) ? '' : out;
}
