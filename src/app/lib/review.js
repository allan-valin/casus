/*
 * Spaced review (drills research 2026-10-20, item 1; spacing and retrieval practice: Cepeda et al. 2006, Karpicke &
 * Roediger 2008): every question answered in Learn or the drills is kept with a Leitner box — a mistake puts it in
 * the first box (back tomorrow), a right answer moves it one box up (3, 7, 16, 35 days) — and the Review tab asks the
 * ones that are due. Kept per language in this browser (casus:review:<code>), like the Learn progress.
 */
const DAY = 86400000;
export const INTERVALS = [0, DAY, 3 * DAY, 7 * DAY, 16 * DAY, 35 * DAY];
const MAX = 2000;   // a browser keeps at most this many per language (the oldest-seen fall out)

const keyOf = (item) => `${item.type ?? ''}|${item.prompt ?? ''}|${(item.furi ?? []).map((f) => f[0]).join('')}|${item.answer}`;

export function createReview(code, storage) {
  const KEY = `casus:review:${code}`;
  let items = {};
  try { items = JSON.parse(storage?.getItem(KEY) ?? '{}') ?? {}; } catch { items = {}; }
  const save = () => {
    const keys = Object.keys(items);
    if (keys.length > MAX) for (const k of keys.sort((a, b) => items[a].seen - items[b].seen).slice(0, keys.length - MAX)) delete items[k];
    try { storage?.setItem(KEY, JSON.stringify(items)); } catch { /* full or private: not kept */ }
  };
  return {
    record(item, correct, now = Date.now()) {
      const k = keyOf(item);
      const prev = items[k];
      const box = correct ? Math.min(INTERVALS.length - 1, (prev?.box ?? 1) + 1) : 1;
      const { onresult, ...plain } = item;   // eslint-disable-line no-unused-vars
      items[k] = { item: plain, box, due: now + INTERVALS[box], seen: now };
      save();
    },
    due(now = Date.now()) {
      return Object.values(items).filter((x) => x.due <= now).sort((a, b) => a.due - b.due).map((x) => x.item);
    },
    size: () => Object.keys(items).length,
  };
}
