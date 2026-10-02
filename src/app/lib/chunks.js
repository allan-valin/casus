/*
 * Glue and soft links read off the cascade's `links` (spec §7.5): every candidate
 * names the token index of its witness (agreement) or governor (government), so
 * the UI never re-derives syntax and never parses the prose reasons.
 */

function linksOf(block, kind) {
  return block.candidates.flatMap((c) => (c.links ?? []).filter((l) => l.kind === kind).map((l) => l.index));
}

/** preposition index -> object index, for adjacent pairs the cascade settled; unglued ones are skipped. */
export function gluePairs(blocks, unglued = new Set()) {
  const out = new Map();
  for (let i = 0; i < blocks.length - 1; i += 1) {
    const prep = blocks[i];
    const object = blocks[i + 1];
    if (unglued.has(prep.token.index)) continue;
    if (!prep.candidates.some((c) => c.analysis.pos === 'prep')) continue;
    if (linksOf(object, 'government').includes(prep.token.index)) out.set(prep.token.index, object.token.index);
  }
  return out;
}

/** token index -> token indices it agrees with, both directions, exactly as the cascade linked them. */
export function partners(blocks) {
  const out = new Map();
  const link = (a, b) => {
    if (!out.has(a)) out.set(a, []);
    if (!out.get(a).includes(b)) out.get(a).push(b);
  };
  for (const block of blocks) {
    for (const index of linksOf(block, 'agreement')) {
      link(block.token.index, index);
      link(index, block.token.index);
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
