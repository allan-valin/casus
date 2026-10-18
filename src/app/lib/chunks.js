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
  // preposition index -> the object's index (one word, Latin) or the indices of its whole governed phrase (German)
  const out = new Map();
  for (let i = 0; i < blocks.length - 1; i += 1) {
    const prep = blocks[i];
    if (unglued.has(prep.token.index)) continue;
    if (!prep.candidates.some((c) => c.analysis.pos === 'prep')) continue;
    const members = [];
    for (let j = i + 1; j < blocks.length && linksOf(blocks[j], 'government').includes(prep.token.index); j += 1) members.push(blocks[j].token.index);
    if (members.length === 1) out.set(prep.token.index, members[0]);
    else if (members.length > 1) out.set(prep.token.index, members);
  }
  // fixed expressions written in a row (es war einmal) are one chunk too, unless already glued
  const glued = new Set([...out].flatMap(([p, m]) => [p, ...(Array.isArray(m) ? m : [m])]));
  const exprOf = (b) => b.candidates.flatMap((c) => c.links ?? []).find((l) => l.kind === 'expression' && l.contiguous);
  for (let i = 0; i < blocks.length; i += 1) {
    const link = exprOf(blocks[i]);
    if (!link || link.index !== blocks[i].token.index || glued.has(blocks[i].token.index) || unglued.has(blocks[i].token.index)) continue;
    const members = [];
    for (let j = i + 1; j < blocks.length && exprOf(blocks[j])?.index === link.index; j += 1) members.push(blocks[j].token.index);
    if (members.length && !members.some((m) => glued.has(m))) out.set(blocks[i].token.index, members.length === 1 ? members[0] : members);
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
    for (const index of [...linksOf(block, 'agreement'), ...linksOf(block, 'reference'), ...linksOf(block, 'expression')]) {
      if (index === block.token.index) continue;
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
  for (const [prep, objects] of glue) {
    const chunk = [prep, ...(Array.isArray(objects) ? objects : [objects])];
    for (const index of chunk) partnerOf.set(index, chunk);
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
