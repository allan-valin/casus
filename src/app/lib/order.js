import { family } from './colors.js';

/* Arrangement of the selected sentence's blocks (spec §7.6): reading order to
 * start, free moves, a stable auto-sort by case, and restore = drop the order. */

const CASE_ORDER = ['nom', 'voc', 'gen', 'dat', 'acc', 'abl', 'loc'];
const GROUP_RANK = Object.fromEntries([...CASE_ORDER, 'verb', 'function', 'unknown'].map((k, i) => [k, i]));

export function initialOrder(blocks) {
  return blocks.map((b) => b.token.index);
}

/** `from` is the token index being moved, `to` its new position in the order. */
export function move(order, from, to) {
  const out = order.filter((n) => n !== from);
  out.splice(to, 0, from);
  return out;
}

/** Move a whole item (one token, or a glued pair) so its members sit together at
 * position `to`, counted in tokens of the order without the item. */
export function moveItem(order, indices, to) {
  const out = order.filter((n) => !indices.includes(n));
  out.splice(to, 0, ...indices);
  return out;
}

/** What a block sorts by: its case when resolved, '?' + the first candidate's case when not. */
export function sortKey(block) {
  if (block.candidates.length === 0) return 'unknown';
  const first = block.candidates[0].analysis;
  const fam = family(first);
  if (fam !== 'nominal') return fam;
  return block.candidates.length === 1 ? first.case : `?${first.case}`;
}

export function autoSort(order, blocks) {
  const byIndex = new Map(blocks.map((b) => [b.token.index, b]));
  const rank = (index) => {
    const key = sortKey(byIndex.get(index)).replace(/^\?/, '');
    return GROUP_RANK[key] ?? GROUP_RANK.unknown;
  };
  return [...order].sort((a, b) => rank(a) - rank(b) || a - b);
}
