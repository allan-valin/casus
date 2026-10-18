// @vitest-environment jsdom
import { describe, it, expect } from 'vitest';
import { createReader } from '../../src/app/stores/reader.svelte.js';

const lexicon = {
  lookupAll: async (keys) => new Map(keys.map((k) => [k, [
    { lemma: `${k}:noun:1`, pos: 'noun', case: 'nom', number: 'sg', gender: 'f' },
    { lemma: `${k}:noun:1`, pos: 'noun', case: 'abl', number: 'sg', gender: 'f' },
  ]])),
};

describe('createReader', () => {
  it('loads, selects the first sentence and exposes its blocks in original order', async () => {
    const r = createReader({ lexicon, text: 'Rosa bona. Urbs magna.' });
    await r.load();
    expect(r.sentences).toHaveLength(2);
    expect(r.selected).toBe(0);
    expect(r.blocks.map((b) => b.token.surface)).toEqual(['Rosa', 'bona']);
    expect(r.order).toEqual([0, 1]);
  });

  it('moves a block and restores the original order', async () => {
    const r = createReader({ lexicon, text: 'Rosa bona magna.' });
    await r.load();
    r.move(2, 0);
    expect(r.order).toEqual([2, 0, 1]);
    r.restoreOrder();
    expect(r.order).toEqual([0, 1, 2]);
  });

  it('keeps one order per sentence', async () => {
    const r = createReader({ lexicon, text: 'Rosa bona. Urbs magna.' });
    await r.load();
    r.move(1, 0);
    r.select(1);
    expect(r.order).toEqual([0, 1]);
    r.select(0);
    expect(r.order).toEqual([1, 0]);
  });

  it('pins re-run the cascade and survive an era or gloss toggle', async () => {
    const r = createReader({ lexicon, text: 'Rosa bona.' });
    await r.load();
    const abl = r.blocks[0].candidates[1].analysis;
    r.pin(0, abl);
    expect(r.blocks[0].pinned).toEqual(abl);
    r.era = 'late';
    r.glossLang = 'pt';
    expect(r.blocks[0].pinned).toEqual(abl);
    expect(r.order).toEqual([0, 1]);
    r.unpin(0);
    expect(r.blocks[0].pinned).toBe(null);
  });

  it('drops a saved order whose length does not fit the sentence', async () => {
    const r = createReader({ lexicon, text: 'Rosa bona.', saved: { text: 'Rosa bona.', selected: 0, pins: [], order: { 0: [2, 1, 0] } } });
    await r.load();
    expect(r.order).toEqual([0, 1]);
  });

  it('serialises everything the spec restores on load (§9)', async () => {
    const r = createReader({ lexicon, text: 'Rosa bona.' });
    await r.load();
    r.layers.verb = false;
    r.era = 'medieval';
    r.move(1, 0);
    r.toggleGlue(0);
    const json = r.toJSON();
    expect(json).toEqual({
      text: 'Rosa bona.', selected: 0, pins: [], layers: { nominal: true, verb: false, function: true, classes: false, marks: true, roman: true, furigana: true },
      era: 'medieval', glossLang: 'en', order: { 0: [1, 0] }, unglued: [0],
    });
    const back = createReader({ lexicon, text: 'Rosa bona.', saved: json });
    await back.load();
    expect(back.order).toEqual([1, 0]);
    expect(back.layers.verb).toBe(false);
    expect(back.unglued.has(0)).toBe(true);
  });
});
