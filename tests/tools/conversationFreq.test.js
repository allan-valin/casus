import { describe, it, expect } from 'vitest';
import { rareWords, unitReport, rankMap, itemWords } from '../../tools/conversation_freq.mjs';

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
  it('a headword listed twice keeps its best rank (明日 あした N5 and あす N4)', () => {
    const m = rankMap([{ w: '明日', rank: 16 }, { w: '明日', rank: 1273 }], (w) => w);
    expect(m.get('明日')).toBe(16);
  });
  it('a Japanese entry is also found by its reading (御飯 ごはん; いる written 居る)', () => {
    const m = rankMap([{ w: '御飯', reading: 'ごはん', rank: 265 }, { w: '居る', reading: 'いる', rank: 40 }], (w) => w);
    expect(m.get('ごはん')).toBe(265);
    expect(m.get('いる')).toBe(40);
  });
  it('Japanese items are split at the word boundaries the build keeps in readings (spaces are dropped in text)', () => {
    const readings = { ですね: { rt: [['です', 'です'], ['ね', 'ね']] } };
    expect(itemWords('ですね', readings)).toEqual(['です', 'ね']);
    expect(itemWords('Добар ден', {})).toEqual(['Добар', 'ден']);
  });
  it('a Japanese cast name counts without its さん (鈴木さん → 鈴木)', async () => {
    expect(await rareWords('鈴木 さん', async () => null, { names: ['鈴木さん (Suzuki-san)'] })).toEqual(['さん']);
  });
  it('a grammar pattern item (written with 〜) is grammar, not vocabulary: never counted as a rare word', async () => {
    const unit = { id: 'A2-12', level: 'A2', new_items: [{ id: 'yori', text: '〜より' }, { id: 'amari', text: 'あまり 〜ません' }] };
    expect((await unitReport(unit, async () => null, { names: [] })).rare).toEqual([]);
  });
});
