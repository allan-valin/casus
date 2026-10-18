import { family as latinFamily } from './colors.js';

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
export function sortKey(block, family = latinFamily) {
  if (block.candidates.length === 0) return 'unknown';
  const first = block.candidates[0].analysis;
  const fam = family(first);
  if (fam !== 'nominal') return fam;
  return block.candidates.length === 1 ? first.case : `?${first.case}`;
}

export function autoSort(order, blocks, family = latinFamily) {
  const byIndex = new Map(blocks.map((b) => [b.token.index, b]));
  const rank = (index) => {
    const key = sortKey(byIndex.get(index), family).replace(/^\?/, '');
    return GROUP_RANK[key] ?? GROUP_RANK.unknown;
  };
  return [...order].sort((a, b) => rank(a) - rank(b) || a - b);
}

/* Word-order arrangements (feedback C7). S = nominative, V = finite verb, O = accusative;
 * every other block follows in its current order. Within S, V and O the current order is
 * kept too, so a hand-made arrangement inside a group survives. */
export const WORD_ORDERS = ['SVO', 'SOV', 'VSO', 'VOS', 'OVS', 'OSV'];

function role(block, family) {
  const key = sortKey(block, family).replace(/^\?/, '');
  if (key === 'nom') return 'S';
  if (key === 'verb') return 'V';
  if (key === 'acc') return 'O';
  return 'rest';
}

export function arrangeBy(order, blocks, pattern, family = latinFamily) {
  const byIndex = new Map(blocks.map((b) => [b.token.index, b]));
  const rank = Object.fromEntries([...pattern].map((r, i) => [r, i]));
  const rankOf = (index) => rank[role(byIndex.get(index), family)] ?? pattern.length;
  return order.map((index, i) => [index, i]).sort((a, b) => rankOf(a[0]) - rankOf(b[0]) || a[1] - b[1]).map(([index]) => index);
}
