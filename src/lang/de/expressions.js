/*
 * Fixed expressions (Allan, 2026-10-18): Wiktionary's multiword entries (data/de/expressions.json, built by
 * tools/casus_build/expressions.py). A contiguous expression (es war einmal, gar nicht, auf jeden Fall) is linked
 * and glued as one chunk; a verb idiom (Bescheid sagen) is found with its verb inflected anywhere in the clause
 * and linked, not glued. Each member carries the expression and its gloss as a reason. Never narrows.
 */
const indexes = new WeakMap();
function indexOf(list) {
  if (!indexes.has(list)) {
    const m = new Map();
    for (const e of list) { const k = e.w[0]; if (!m.has(k)) m.set(k, []); m.get(k).push(e); }
    for (const v of m.values()) v.sort((a, b) => b.w.length - a.w.length);   // longest first
    indexes.set(list, m);
  }
  return indexes.get(list);
}
const withExpr = (b, link, reason) => ({ ...b, candidates: b.candidates.map((c) => (c.reasons.includes(reason) ? c : { ...c, reasons: [...c.reasons, reason], links: [...(c.links ?? []), link] })) });

export function expressionStage(blocks, ctx) {
  const list = ctx?.expressions;
  if (!list?.length) return blocks;
  const idx = indexOf(list);
  const out = blocks.slice();
  const taken = new Set();
  for (let i = 0; i < out.length; i += 1) {
    if (taken.has(i)) continue;
    const first = out[i].token.key.toLowerCase();
    for (const e of idx.get(first) ?? []) {
      // the words in a row, no punctuation or number between
      let ok = true;
      for (let k = 1; k < e.w.length; k += 1) {
        const b = out[i + k];
        if (!b || b.token.index !== out[i].token.index + k || b.token.key.toLowerCase() !== e.w[k]) { ok = false; break; }
      }
      if (!ok) continue;
      const span = e.w.map((_, k) => i + k);
      let verb = null;
      if (e.v) {
        const ids = new Set(e.v.map(String));
        const clause = out[i].token.clause;
        verb = out.findIndex((b, j) => !span.includes(j) && b.token.clause === clause && b.candidates.some((c) => c.analysis.pos === 'verb' && ids.has(String(c.analysis.lemma))));
        if (verb < 0) continue;
      }
      const label = e.v ? `${e.h.split(' ').slice(0, -1).join(' ')} … ${e.h.split(' ').at(-1)}` : e.h;
      const reason = `expression: ${label} — ${e.g}`;
      const firstIndex = out[i].token.index;
      for (const j of span) { out[j] = withExpr(out[j], { kind: 'expression', index: firstIndex, contiguous: true }, reason); taken.add(j); }
      if (verb !== null) out[verb] = withExpr(out[verb], { kind: 'expression', index: firstIndex, contiguous: false }, reason);
      break;
    }
  }
  return out;
}
