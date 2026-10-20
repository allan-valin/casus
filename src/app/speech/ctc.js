// Copied from speech-to-ipa (github.com/allan-valin/speech-to-ipa, web/app/ctc.js) for the pronunciation trainer.
// Greedy CTC: argmax per frame, merge repeats, drop the blank and <...>/[...] tokens.
// Each phone keeps its frame span [start, end), which becomes its audio slice.

export function greedyCtc(logits, frames, vocabSize, id2sym, blank) {
  const out = [];
  let prev = -1;
  for (let t = 0; t < frames; t++) {
    let best = -Infinity, id = 0;
    for (let k = 0; k < vocabSize; k++) {
      const x = logits[t * vocabSize + k];
      if (x > best) { best = x; id = k; }
    }
    if (id === prev) {
      if (out.length && out[out.length - 1].id === id) out[out.length - 1].end = t + 1;
      continue;
    }
    prev = id;
    const sym = id2sym[id] || "";
    if (id === blank || !sym.trim() || /^[<[].*[>\]]$/.test(sym) || sym === "▁" || sym === "|") continue;
    const last = out[out.length - 1];
    if (last && MODIFIER.test(sym)) {           // a bare diacritic/length token joins the phone before
      last.sym += sym; last.end = t + 1; last.id = id;
      continue;
    }
    out.push({ id, sym, start: t, end: t + 1 });
  }
  return out.map(({ sym, start, end }) => ({ sym, start, end }));
}

// Tokens made only of combining marks (Mn) or modifier letters/symbols (Lm, Sk):
// ̪ ̃ ː ʰ ʲ ʷ ˤ tone letters… They describe the phone before them.
const MODIFIER = /^[\p{Mn}\p{Lm}\p{Sk}]+$/u;
