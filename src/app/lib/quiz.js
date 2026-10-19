/*
 * Multiple choice (Allan, 2026-10-18: drills for the most frequent words and for set phrases and sayings):
 * an item's answer among up to three others drawn from the list; a missed item comes back within three turns.
 */
// ordered: the items once each, in their order (Learn, 2026-10-19: hundreds per lesson); missed ones still come back
export function createChoiceQuiz(items, { random = Math.random, size = 4, ordered = false } = {}) {
  let cursor = 0;
  const score = { right: 0, total: 0 };
  let streak = 0;
  const weak = [];                                   // { item, wait }
  let current = null;
  const pickIndex = (n) => Math.min(n - 1, Math.floor(random() * n));

  function draw(avoid) {
    const due = weak.find((w) => w.wait <= 0);
    if (due) { weak.splice(weak.indexOf(due), 1); return due.item; }
    if (ordered) { const item = items[cursor % items.length]; cursor += 1; return item; }
    let item = items[pickIndex(items.length)];
    for (let k = 0; k < 4 && items.length > 1 && item === avoid; k += 1) item = items[pickIndex(items.length)];
    return item;
  }
  function choicesFor(item) {
    // a question may bring its own wrong answers (Learn: meanings for a meaning question, patterns for a gap)
    const others = [...new Set((item.pool ?? items.map((i) => i.answer)).filter((a) => a !== item.answer))];
    const picked = [];
    const need = Math.min(size - 1, others.length);
    while (picked.length < need) {
      const a = others.splice(pickIndex(others.length), 1)[0];
      picked.push(a);
    }
    const out = [...picked];
    out.splice(pickIndex(out.length + 1), 0, item.answer);
    return out;
  }
  function start(avoid = null) { const item = draw(avoid); current = { item, choices: choicesFor(item) }; }
  start();

  return {
    current: () => current,
    get score() { return score; },
    get streak() { return streak; },
    answer(choice) {
      const correct = choice === current.item.answer;
      score.total += 1;
      if (correct) { score.right += 1; streak += 1; } else { streak = 0; weak.push({ item: current.item, wait: ordered ? 4 : 2 }); }
      return { correct, expected: current.item.answer };
    },
    next() { weak.forEach((w) => { w.wait -= 1; }); start(current.item); },
  };
}
