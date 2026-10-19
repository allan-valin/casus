/* Modern Greek writes σε + the article as one word (στο, στη, στον, στην, στα, στις, στους, στου, στης, στων): split
 * into the preposition (σ', keyed σε) and the article, so the article's case shows and σε governs the accusative. */
const ARTICLES = new Set(['ο', 'η', 'το', 'τον', 'την', 'τα', 'τις', 'τους', 'του', 'της', 'των', 'τη']);
export async function splitWords(tokens) {
  const out = [];
  for (const t of tokens) {
    const rest = t.kind === 'word' && /^στ/i.test(t.surface) ? t.surface.slice(1) : null;
    if (rest && ARTICLES.has(rest.toLowerCase().normalize('NFD').replace(/[́]/g, '').normalize('NFC'))) {
      out.push({ ...t, surface: t.surface[0], key: 'σε', end: t.start + 1 });
      out.push({ ...t, surface: rest, key: rest.toLowerCase(), start: t.start + 1 });
    } else out.push(t);
  }
  return out;
}
