/*
 * Glue and soft links read off the cascade's reasons (spec §7.5). The cascade
 * already says who governs whom and who agrees with whom; the UI never
 * re-derives syntax.
 */
const GOVERNED_BY = /^government: governed by (\S+) /;
const AGREES_WITH = /^agreement: matches (\S+) /;

function reasonsOf(block) {
  return block.candidates.flatMap((c) => c.reasons);
}

/** preposition index -> object index, for adjacent pairs the cascade settled; unglued ones are skipped. */
export function gluePairs(blocks, unglued = new Set()) {
  const out = new Map();
  for (let i = 0; i < blocks.length - 1; i += 1) {
    const prep = blocks[i];
    const object = blocks[i + 1];
    if (unglued.has(prep.token.index)) continue;
    if (!prep.candidates.some((c) => c.analysis.pos === 'prep')) continue;
    const named = reasonsOf(object).map((r) => GOVERNED_BY.exec(r)?.[1]).filter(Boolean);
    if (named.includes(prep.token.surface)) out.set(prep.token.index, object.token.index);
  }
  return out;
}

/** token index -> token indices it agrees with, both directions, by surface name in the reason. */
export function partners(blocks) {
  const bySurface = new Map(blocks.map((b) => [b.token.surface, b.token.index]));
  const out = new Map();
  const link = (a, b) => {
    if (!out.has(a)) out.set(a, []);
    if (!out.get(a).includes(b)) out.get(a).push(b);
  };
  for (const block of blocks) {
    for (const r of reasonsOf(block)) {
      const target = AGREES_WITH.exec(r)?.[1];
      if (target && bySurface.has(target)) {
        link(block.token.index, bySurface.get(target));
        link(bySurface.get(target), block.token.index);
      }
    }
  }
  return out;
}

/** The pool's draggable items in display order; a glued pair sits at the earliest
 * position either of its members holds, so dragging the chunk (which moves one
 * index in the order) carries both. */
export function items(blocks, order, glue) {
  const partnerOf = new Map();
  for (const [prep, object] of glue) {
    partnerOf.set(prep, [prep, object]);
    partnerOf.set(object, [prep, object]);
  }
  const done = new Set();
  const out = [];
  for (const index of order) {
    if (done.has(index)) continue;
    const indices = partnerOf.get(index) ?? [index];
    indices.forEach((i) => done.add(i));
    out.push({ id: indices.join('+'), indices });
  }
  return out;
}
