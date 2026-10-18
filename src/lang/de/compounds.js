/* CMP (Allan, 2026-10-18): a compound noun's roots, from data/de/compounds.json (lemma id -> root lengths of the
 * headword, tools/casus_build/de/compounds.py). The inflected ending stays with the last root. Display only. */
export function compoundStage(blocks, ctx) {
  const table = ctx?.compounds;
  if (!table) return blocks;
  return blocks.map((b) => {
    const lemma = b.candidates.find((c) => c.analysis.pos === 'noun' && table[String(c.analysis.lemma)]);
    if (!lemma) return b;
    const lengths = table[String(lemma.analysis.lemma)];
    const surface = b.token.surface;
    const fixed = lengths.slice(0, -1).reduce((n, x) => n + x, 0);
    if (surface.length <= fixed + 1) return b;
    const parts = [];
    let at = 0;
    for (const n of lengths.slice(0, -1)) { parts.push(surface.slice(at, at + n)); at += n; }
    parts.push(surface.slice(at));
    return { ...b, parts };
  });
}
