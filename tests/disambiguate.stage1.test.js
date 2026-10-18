import { describe, it, expect } from 'vitest';
import { buildBlocks, narrow } from '../src/lib/disambiguate.js';

const rosa = [
  { lemma: 'ros:noun:1', pos: 'noun', case: 'nom', number: 'sg', gender: 'f' },
  { lemma: 'ros:noun:1', pos: 'noun', case: 'abl', number: 'sg', gender: 'f' },
  { lemma: 'ros:noun:1', pos: 'noun', case: 'voc', number: 'sg', gender: 'f' },
];

const tokens = [{ index: 0, surface: 'rosa', key: 'rosa', kind: 'word', enclitic: null }];

describe('buildBlocks', () => {
  it('keeps every analysis as a candidate', () => {
    const [block] = buildBlocks(tokens, new Map([['rosa', rosa]]));
    expect(block.candidates).toHaveLength(3);
    expect(block.resolved).toBe(false);
    expect(block.pinned).toBe(null);
    expect(block.token).toBe(tokens[0]);
  });

  it('starts every candidate with the lexicon reason', () => {
    const [block] = buildBlocks(tokens, new Map([['rosa', rosa]]));
    for (const c of block.candidates) expect(c.reasons).toEqual(['lexicon: attested form']);
  });

  it('marks a single-analysis block resolved', () => {
    const one = [rosa[0]];
    const [block] = buildBlocks(tokens, new Map([['rosa', one]]));
    expect(block.resolved).toBe(true);
  });

  it('keeps unknown words as blocks with no candidates', () => {
    const [block] = buildBlocks(tokens, new Map());
    expect(block.candidates).toEqual([]);
    expect(block.resolved).toBe(false);
  });

  it('skips punctuation tokens', () => {
    const withPunct = [...tokens, { index: 1, surface: ',', key: ',', kind: 'punct' }];
    expect(buildBlocks(withPunct, new Map([['rosa', rosa]]))).toHaveLength(1);
  });
});

describe('narrow', () => {
  it('applies a stage that removes some candidates', () => {
    const blocks = buildBlocks(tokens, new Map([['rosa', rosa]]));
    const dropVoc = (bs) => bs.map((b) => ({
      ...b,
      candidates: b.candidates.filter((c) => c.analysis.case !== 'voc'),
    }));
    expect(narrow(blocks, dropVoc)[0].candidates).toHaveLength(2);
  });

  it('reverts a stage that would empty a block', () => {
    const blocks = buildBlocks(tokens, new Map([['rosa', rosa]]));
    const dropAll = (bs) => bs.map((b) => ({ ...b, candidates: [] }));
    expect(narrow(blocks, dropAll)[0].candidates).toHaveLength(3);
  });

  it('reverts only the emptied block, keeping other narrowing', () => {
    const two = [
      ...tokens,
      { index: 1, surface: 'urbem', key: 'urbem', kind: 'word', enclitic: null },
    ];
    const blocks = buildBlocks(two, new Map([['rosa', rosa], ['urbem', [rosa[0]]]]));
    const dropNom = (bs) => bs.map((b) => ({
      ...b,
      candidates: b.candidates.filter((c) => c.analysis.case !== 'nom'),
    }));
    const out = narrow(blocks, dropNom);
    expect(out[0].candidates).toHaveLength(2); // narrowed
    expect(out[1].candidates).toHaveLength(1); // reverted, not emptied
  });

  it('recomputes resolved after narrowing', () => {
    const blocks = buildBlocks(tokens, new Map([['rosa', rosa]]));
    const keepNom = (bs) => bs.map((b) => ({
      ...b,
      candidates: b.candidates.filter((c) => c.analysis.case === 'nom'),
    }));
    expect(narrow(blocks, keepNom)[0].resolved).toBe(true);
  });

  it('does not mutate its input', () => {
    const blocks = buildBlocks(tokens, new Map([['rosa', rosa]]));
    const before = structuredClone(blocks);
    narrow(blocks, (bs) => bs.map((b) => ({ ...b, candidates: [] })));
    expect(blocks).toEqual(before);
  });
});

describe('narrow guards the block list itself', () => {
  it('throws when a stage returns a different number of blocks', () => {
    const blocks = buildBlocks(tokens, new Map([['rosa', rosa]]));
    expect(() => narrow(blocks, () => [])).toThrow(/blocks/);
  });
  it('throws when a stage reorders the blocks', () => {
    const two = [...tokens, { index: 1, surface: 'urbem', key: 'urbem', kind: 'word', enclitic: null }];
    const blocks = buildBlocks(two, new Map([['rosa', rosa], ['urbem', [rosa[0]]]]));
    expect(() => narrow(blocks, (bs) => [bs[1], bs[0]])).toThrow(/order/);
  });
});

describe('alternative keys (languages phase 3: German sentence-initial capitals)', () => {
  it('a token with an altKey gets the readings of both keys; a token without one is unchanged', async () => {
    const { buildBlocks } = await import('../src/lib/disambiguate.js');
    const analyses = new Map([['Essen', [{ lemma: '1', pos: 'noun', case: 'nom', number: 'sg', gender: 'n' }]], ['essen', [{ lemma: '2', pos: 'verb', person: '0', number: 'x', mood: 'inf' }]]]);
    const [a, b] = buildBlocks([
      { index: 0, surface: 'Essen', key: 'Essen', altKey: 'essen', kind: 'word' },
      { index: 1, surface: 'Essen', key: 'Essen', kind: 'word' },
    ], analyses);
    expect(a.candidates.map((c) => c.analysis.pos)).toEqual(['noun', 'verb']);
    expect(b.candidates.map((c) => c.analysis.pos)).toEqual(['noun']);
  });
});
