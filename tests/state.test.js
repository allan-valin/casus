import { describe, it, expect } from 'vitest';
import { createState } from '../src/lib/state.js';
import { getLanguage } from '../src/lang/registry.js';
const la = getLanguage('la');

const lexicon = {
  lookupAll: async (keys) => new Map(keys.map((k) => [k, [
    { lemma: `${k}:noun:1`, pos: 'noun', case: 'nom', number: 'sg', gender: 'f' },
  ]])),
};

describe('createState', () => {
  it('exposes sentences after loading', async () => {
    const s = createState({ text: 'Rosa bona. Urbs magna.', lexicon, lang: la });
    await s.load();
    expect(s.sentences()).toHaveLength(2);
    expect(s.sentences()[1].text).toBe('Urbs magna.');
  });

  it('selects the first sentence by default', async () => {
    const s = createState({ text: 'Rosa bona. Urbs magna.', lexicon, lang: la });
    await s.load();
    expect(s.selected()).toBe(0);
    expect(s.blocks().map((b) => b.token.surface)).toEqual(['Rosa', 'bona']);
  });

  it('builds blocks only for the selected sentence', async () => {
    const s = createState({ text: 'Rosa bona. Urbs magna.', lexicon, lang: la });
    await s.load();
    s.select(1);
    expect(s.blocks().map((b) => b.token.surface)).toEqual(['Urbs', 'magna']);
  });

  it('round-trips pins through toJSON', async () => {
    const s = createState({ lang: la, text: 'Rosa bona.', lexicon });
    await s.load();
    const analysis = s.blocks()[0].candidates[0].analysis;
    s.pin(0, analysis);
    expect(s.toJSON().pins).toEqual([{ sentence: 0, tokenIndex: 0, analysis }]);
    expect(s.blocks()[0].pinned).toEqual(analysis);
    s.unpin(0);
    expect(s.toJSON().pins).toEqual([]);
    expect(s.blocks()[0].pinned).toBe(null);
  });

  it('serialises the text, the selection and the pins', async () => {
    const s = createState({ text: 'Rosa bona. Urbs magna.', lexicon, lang: la });
    await s.load();
    s.select(1);
    expect(s.toJSON()).toEqual({ text: 'Rosa bona. Urbs magna.', selected: 1, pins: [] });
  });

  it('restores pins and selection from a saved object', async () => {
    const first = createState({ text: 'Rosa bona. Urbs magna.', lexicon, lang: la });
    await first.load();
    first.select(1);
    first.pin(1, first.blocks()[1].candidates[0].analysis);
    const second = createState({ lang: la, text: 'Rosa bona. Urbs magna.', lexicon, saved: first.toJSON() });
    await second.load();
    expect(second.selected()).toBe(1);
    expect(second.blocks()[1].pinned).toEqual(first.blocks()[1].pinned);
  });

  it('keeps a word whole when the whole form is attested, and splits it otherwise', async () => {
    const attested = new Set(['legione', 'populus', 'que', 'senatus']);
    const lex = {
      lookupAll: async (keys) => new Map(keys.map((k) => [k, attested.has(k)
        ? [{ lemma: `${k}:noun:1`, pos: 'noun', case: 'nom', number: 'sg', gender: 'f' }]
        : []])),
    };
    const s = createState({ lang: la, text: 'senatus populusque legione.', lexicon: lex });
    await s.load();
    expect(s.blocks().map((b) => b.token.key)).toEqual(['senatus', 'populus', 'que', 'legione']);
    expect(s.blocks().map((b) => b.token.index)).toEqual([0, 1, 2, 3]);
  });

  it('looks every key of every sentence up in one batch', async () => {
    const calls = [];
    const lex = { lookupAll: async (keys) => { calls.push(keys); return new Map(keys.map((k) => [k, []])); } };
    const s = createState({ lang: la, text: 'Rosa bona. Urbs magna.', lexicon: lex });
    await s.load();
    expect(calls).toHaveLength(1);
    expect(new Set(calls[0])).toEqual(new Set(['rosa', 'bona', 'urbs', 'magna']));
  });
});

describe('createState and the language definition', () => {
  it('uses the language\'s segment, tokenize and stages', async () => {
    const lang = { ...la, segment: (t) => [{ text: t, start: 0, end: t.length }] };
    const s = createState({ text: 'Rosa. Bona.', lexicon, lang });
    await s.load();
    expect(s.sentences()).toHaveLength(1);
  });
  it('refuses to run without a language', () => {
    expect(() => createState({ text: 'Rosa.', lexicon })).toThrow(/lang/);
  });
});

describe('createState looks up alternative keys too', () => {
  it('asks the lexicon for altKey', async () => {
    const asked = [];
    const lx = { lookupAll: async (keys) => { asked.push(...keys); return new Map(keys.map((k) => [k, []])); } };
    const lang = { ...la, tokenize: (s) => [{ index: 0, surface: 'Essen', key: 'Essen', altKey: 'essen', kind: 'word', start: 0, end: 5 }] };
    const s = createState({ text: 'Essen.', lexicon: lx, lang });
    await s.load();
    expect(asked).toContain('essen');
  });
});
