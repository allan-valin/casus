/* Latin letters for a language's own script (Allan, 2026-10-18/19): only text written in another script gets
 * them, so an English meaning beside a Greek word is left alone. */
const OTHER_SCRIPT = /[^\p{Script=Latin}\p{Script=Common}\p{Script=Inherited}]/u;
export function romanOf(text, romanize) {
  if (!romanize || !text || !OTHER_SCRIPT.test(text)) return '';
  return romanize(text);
}
