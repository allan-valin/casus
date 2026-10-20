/** The word under a click in a Learn page, so it can open its dictionary entry as in the Reader (Allan, 2026-10-20).
 * Spaced languages: the run of letters around the offset. Japanese and Chinese have no spaces: every span that
 * covers the offset is a candidate, longest first, and the first one the dictionary knows is the word. */

const LETTER = /[\p{L}\p{M}'’]/u;

/** { word, start, end } of the letters around `offset`, or null when it is not on a letter */
export function wordAround(text, offset) {
  if (!LETTER.test(text[offset] ?? '')) return null;
  let start = offset, end = offset + 1;
  while (start > 0 && LETTER.test(text[start - 1])) start--;
  while (end < text.length && LETTER.test(text[end])) end++;
  return { word: text.slice(start, end), start, end };
}

/** spans of letters (no punctuation inside) that cover `offset`, at most `max` long: longest first, then leftmost */
export function candidatesAt(text, offset, max = 8) {
  const out = [];
  for (let len = max; len >= 1; len--) {
    for (let start = Math.max(0, offset - len + 1); start <= offset; start++) {
      const word = text.slice(start, start + len);
      if (word.length === len && [...word].every((ch) => /[\p{L}\p{M}]/u.test(ch))) out.push({ word, start, end: start + len });
    }
  }
  return out;
}

/** the first candidate `lookup` (async, word -> analyses) finds anything for, or null */
export async function firstKnown(candidates, lookup) {
  for (const c of candidates) {
    const found = await lookup(c.word).catch(() => []);
    if (found?.length) return c;
  }
  return null;
}
