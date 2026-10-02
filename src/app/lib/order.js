// Task 5 stub; Task 10 replaces it test-first.
export function initialOrder(blocks) { return blocks.map((b) => b.token.index); }
export function move(order, from, to) {
  const out = order.filter((n) => n !== from);
  out.splice(to, 0, from);
  return out;
}
export function autoSort(order) { return [...order]; }
