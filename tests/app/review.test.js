import { describe, it, expect } from 'vitest';
import { createReview, INTERVALS } from '../../src/app/lib/review.js';

const store = () => { const m = new Map(); return { getItem: (k) => m.get(k) ?? null, setItem: (k, v) => m.set(k, String(v)), m }; };
const DAY = 86400000;
const item = (p) => ({ prompt: p, answer: `${p}!`, pool: ['a', 'b', 'c'] });

describe('spaced review (drills research 2026-10-20, item 1)', () => {
  it('an item answered wrong comes back tomorrow; right moves it up a box and further away', () => {
    const s = store(); const r = createReview('la', s);
    r.record(item('rosae'), false, 0);
    expect(r.due(0)).toHaveLength(0);
    expect(r.due(DAY).map((x) => x.prompt)).toEqual(['rosae']);
    r.record(item('rosae'), true, DAY);
    expect(r.due(DAY + INTERVALS[2] - 1)).toHaveLength(0);
    expect(r.due(DAY + INTERVALS[2]).length).toBe(1);
    r.record(item('rosae'), false, 5 * DAY);
    expect(r.due(6 * DAY)).toHaveLength(1);           // a mistake sends it back to the first box
  });
  it('kept per language in the browser, and counted', () => {
    const s = store();
    createReview('la', s).record(item('x'), true, 0);
    const again = createReview('la', s);
    expect(again.size()).toBe(1);
    expect(createReview('de', s).size()).toBe(0);
    expect(JSON.parse(s.getItem('casus:review:la'))).toBeTruthy();
  });
});
