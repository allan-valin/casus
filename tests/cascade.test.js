import { describe, it, expect } from 'vitest';
import { runCascade } from '../src/lib/disambiguate.js';

const inPrep = [{ lemma: 'in:prep:1', pos: 'prep' }];
const magnam = [
  { lemma: 'magn:adj:1', pos: 'adj', case: 'acc', number: 'sg', gender: 'f' },
  { lemma: 'magn:adj:1', pos: 'adj', case: 'gen', number: 'pl', gender: 'f' },
];
const urbem = [
  { lemma: 'urb:noun:1', pos: 'noun', case: 'acc', number: 'sg', gender: 'f' },
  { lemma: 'urb:noun:1', pos: 'noun', case: 'dat', number: 'pl', gender: 'f' },
];

const tokens = ['in', 'magnam', 'urbem'].map((key, index) => ({
  index, surface: key, key, kind: 'word', enclitic: null,
}));
const analyses = new Map([['in', inPrep], ['magnam', magnam], ['urbem', urbem]]);

describe('runCascade', () => {
  it('resolves a chain through government and agreement', () => {
    const blocks = runCascade(tokens, analyses);
    expect(blocks[2].candidates.map((c) => c.analysis.case)).toEqual(['acc']);
    expect(blocks[1].candidates.map((c) => c.analysis.case)).toEqual(['acc']);
    expect(blocks[0].candidates[0].analysis.governs).toEqual(['acc']);
  });

  it('carries a reason for every surviving candidate', () => {
    for (const block of runCascade(tokens, analyses)) {
      for (const candidate of block.candidates) {
        expect(candidate.reasons.length).toBeGreaterThan(0);
      }
    }
  });

  it('never empties a candidate set', () => {
    const junk = new Map([['in', inPrep], ['magnam', magnam],
                          ['urbem', [{ lemma: 'z', pos: 'noun', case: 'gen',
                                       number: 'sg', gender: 'm' }]]]);
    for (const block of runCascade(tokens, junk)) {
      expect(block.candidates.length).toBeGreaterThan(0);
    }
  });

  it('propagates a pin through agreement', () => {
    // Without the preposition, agreement alone resolves magnam against urbem...
    const pair = tokens.slice(1).map((t, index) => ({ ...t, index }));
    expect(runCascade(pair, analyses)[0].candidates.map((c) => c.analysis.case)).toEqual(['acc']);
    // ...and the reader pinning urbem as dat pl takes that witness away.
    const pins = new Map([[1, urbem[1]]]);
    const blocks = runCascade(pair, analyses, { pins });
    expect(blocks[1].candidates).toHaveLength(1);
    expect(blocks[1].pinned).toEqual(urbem[1]);
    expect(blocks[1].resolved).toBe(true);
    expect(blocks[1].candidates[0].reasons.join(' ')).toMatch(/pin/i);
    expect(blocks[0].candidates.map((c) => c.analysis.case)).toEqual(['acc', 'gen']);
  });

  it('a pin does not undo what a preposition settles', () => {
    const pins = new Map([[2, urbem[1]]]);
    const blocks = runCascade(tokens, analyses, { pins });
    expect(blocks[1].candidates.map((c) => c.analysis.case)).toEqual(['acc']); // in + magnam
    expect(blocks[1].candidates[0].reasons.join(' ')).not.toMatch(/urbem/);
  });

  it('is deterministic', () => {
    expect(runCascade(tokens, analyses)).toEqual(runCascade(tokens, analyses));
  });

  it('keeps unknown words as empty blocks and skips punctuation', () => {
    const withExtra = [...tokens,
      { index: 3, surface: ',', key: ',', kind: 'punct', enclitic: null },
      { index: 4, surface: 'xyzzy', key: 'xyzzy', kind: 'word', enclitic: null }];
    const blocks = runCascade(withExtra, analyses);
    expect(blocks).toHaveLength(4);
    expect(blocks[3].candidates).toEqual([]);
  });

  it('a pin on an unknown word still creates the candidate', () => {
    const reading = { lemma: 'x:noun:1', pos: 'noun', case: 'nom', number: 'sg', gender: 'm' };
    const blocks = runCascade(tokens, new Map(), { pins: new Map([[1, reading]]) });
    expect(blocks[1].candidates.map((c) => c.analysis)).toEqual([reading]);
  });
});
