import { describe, it, expect } from 'vitest';
import { getLanguage } from '../../src/lang/registry.js';
import { createState } from '../../src/lib/state.js';
import { makeColors } from '../../src/app/lib/colors.js';

const fi = getLanguage('fi');
describe('Finnish', () => {
  it('fifteen cases fold onto six hues, each with its badge; inner local cases share a hue', () => {
    const colors = makeColors(fi.inventory);
    const L = { nominal: true, verb: true, function: true };
    const block = (c) => ({ token: { index: 0, surface: 'x', key: 'x' }, candidates: [{ analysis: { lemma: '1', pos: 'noun', case: c, number: 'sg' }, reasons: [], links: [] }], pinned: null });
    const ine = colors.blockStyle(block('ine'), L);
    const ill = colors.blockStyle(block('ill'), L);
    expect(ine.badge).toBe('Ine');
    expect(ill.badge).toBe('Ill');
    expect(ill.border).toBe(ine.border);
    expect(ill.borderStyle).not.toBe(ine.borderStyle);
  });
  it('reads a sentence', async () => {
    const LEX = { minä: [{ lemma: 'm', pos: 'pron', case: 'nom', number: 'sg' }], asun: [{ lemma: 'a', pos: 'verb', person: '1', number: 'sg', tense: 'pres', mood: 'ind' }],
      helsingissä: [{ lemma: 'h', pos: 'noun', case: 'ine', number: 'sg' }] };
    const lexicon = { lookupAll: async (keys) => new Map(keys.map((k) => [k, LEX[k] ?? []])) };
    const s = createState({ text: 'Minä asun Helsingissä.', lexicon, lang: fi });
    await s.load();
    expect(s.blocks().map((b) => b.candidates[0]?.analysis.case ?? b.candidates[0]?.analysis.pos)).toEqual(['nom', 'verb', 'ine']);
  });
});
