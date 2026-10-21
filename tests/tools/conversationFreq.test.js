import { describe, it, expect } from 'vitest';
import { rareWords, unitReport } from '../../tools/conversation_freq.mjs';

/* Allan, 2026-10-21: early units should use frequent words; a rare word in A1 must be a deliberate choice. */
const ranks = new Map([['добар', 300], ['ден', 120], ['клуч', 2500]]);
const rankOf = async (word) => ranks.get(word.toLowerCase()) ?? null;   // null: not among the top 1000 lemmas

describe('word frequency in conversation units', () => {
  it('a word outside the top 1000 is rare; names are not counted', async () => {
    expect(await rareWords('Добар ден', rankOf)).toEqual([]);
    expect(await rareWords('Ова е клучот, Вера', rankOf, { names: ['Вера'], top: 1000 })).toEqual(['Ова', 'е', 'клучот']);
  });
  it('items marked rare: true are deliberate and not reported; A1 warns past three unmarked rare words', async () => {
    const unit = { id: 'A1-01', level: 'A1', new_items: [
      { id: 'a', text: 'Добар ден' }, { id: 'b', text: 'Wohnungsgeberbestätigung', rare: true },
      { id: 'c', text: 'x1' }, { id: 'd', text: 'x2' }, { id: 'e', text: 'x3' }, { id: 'f', text: 'x4' }] };
    const r = await unitReport(unit, rankOf, { names: [] });
    expect(r.rare.map((x) => x.item)).toEqual(['c', 'd', 'e', 'f']);
    expect(r.warning).toMatch(/A1-01: 4 new items with rare words/);
  });
});
