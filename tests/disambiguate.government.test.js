import { describe, it, expect } from 'vitest';
import { buildBlocks, narrow, governmentStage } from '../src/lib/disambiguate.js';
import { GOVERNMENT } from '../src/lib/prepositions.js';

const inPrep = [{ lemma: 'in:prep:1', pos: 'prep' }];
const galliam = [
  { lemma: 'gall:noun:1', pos: 'noun', case: 'acc', number: 'sg', gender: 'f' },
];
const urbe = [
  { lemma: 'urb:noun:1', pos: 'noun', case: 'abl', number: 'sg', gender: 'f' },
];
const ambiguous = [
  { lemma: 'x:noun:1', pos: 'noun', case: 'acc', number: 'sg', gender: 'f' },
  { lemma: 'x:noun:1', pos: 'noun', case: 'abl', number: 'sg', gender: 'f' },
  { lemma: 'x:noun:1', pos: 'noun', case: 'dat', number: 'sg', gender: 'f' },
];

function blocksFor(pairs) {
  const tokens = pairs.map(([key], i) => ({
    index: i, surface: key, key, kind: 'word', enclitic: null,
  }));
  return buildBlocks(tokens, new Map(pairs));
}

describe('GOVERNMENT', () => {
  it('lists the cases every key governs, u for v', () => {
    expect(GOVERNMENT.in).toEqual(['acc', 'abl']);
    expect(GOVERNMENT.cum).toEqual(['abl']);
    expect(Object.keys(GOVERNMENT).every((k) => !/[jv]/.test(k))).toBe(true);
  });
});

describe('governmentStage', () => {
  it('narrows the object to a case the preposition governs', () => {
    const out = narrow(blocksFor([['in', inPrep], ['x', ambiguous]]), governmentStage);
    const cases = out[1].candidates.map((c) => c.analysis.case).sort();
    expect(cases).toEqual(['abl', 'acc']); // dative eliminated
  });

  it('resolves the preposition from an unambiguous object', () => {
    const out = narrow(blocksFor([['in', inPrep], ['galliam', galliam]]), governmentStage);
    expect(out[0].candidates[0].analysis.governs).toEqual(['acc']);
    expect(out[0].candidates[0].reasons.join(' ')).toMatch(/government.*galliam/);
    expect(out[1].candidates[0].reasons.join(' ')).toMatch(/government.*in/);
  });

  it('resolves in + ablative object to the ablative sense', () => {
    const out = narrow(blocksFor([['in', inPrep], ['urbe', urbe]]), governmentStage);
    expect(out[0].candidates[0].analysis.governs).toEqual(['abl']);
  });

  it('leaves both ambiguous when neither settles the other', () => {
    const out = narrow(blocksFor([['in', inPrep], ['x', ambiguous]]), governmentStage);
    expect(out[0].candidates[0].analysis.governs).toEqual(['acc', 'abl']);
  });

  it('applies an unambiguous preposition without needing agreement', () => {
    const out = narrow(blocksFor([['cum', [{ lemma: 'cum:prep:1', pos: 'prep' }]],
                                  ['x', ambiguous]]), governmentStage);
    expect(out[1].candidates.map((c) => c.analysis.case)).toEqual(['abl']);
  });

  it('never empties an object that matches no governed case', () => {
    const genOnly = [{ lemma: 'y:noun:1', pos: 'noun', case: 'gen', number: 'sg', gender: 'f' }];
    const out = narrow(blocksFor([['cum', [{ lemma: 'cum:prep:1', pos: 'prep' }]],
                                  ['y', genOnly]]), governmentStage);
    expect(out[1].candidates).toHaveLength(1);
  });

  it('falls back to what the lexicon says a preposition not in the table governs', () => {
    const tenus = [{ lemma: 'tenus:prep:1', pos: 'prep', governs: 'abl' }];
    const out = narrow(blocksFor([['tenus', tenus], ['x', ambiguous]]), governmentStage);
    expect(out[0].candidates[0].analysis.governs).toEqual(['abl']);
    expect(out[1].candidates.map((c) => c.analysis.case)).toEqual(['abl']);
  });

  it('narrows an adjective standing between the preposition and its noun', () => {
    const magnam = [
      { lemma: 'magn:adj:1', pos: 'adj', case: 'acc', number: 'sg', gender: 'f' },
      { lemma: 'magn:adj:1', pos: 'adj', case: 'gen', number: 'pl', gender: 'f' },
    ];
    const out = narrow(blocksFor([['in', inPrep], ['magnam', magnam], ['urbem', galliam]]), governmentStage);
    expect(out[1].candidates.map((c) => c.analysis.case)).toEqual(['acc']);
  });

  it('is idempotent', () => {
    const once = narrow(blocksFor([['in', inPrep], ['galliam', galliam]]), governmentStage);
    const twice = narrow(once, governmentStage);
    expect(twice).toEqual(once);
  });

  it('does nothing to a sentence without prepositions', () => {
    const blocks = blocksFor([['x', ambiguous]]);
    expect(narrow(blocks, governmentStage)).toEqual(blocks);
  });
});

describe('government links', () => {
  it('links the object to its preposition and the preposition to its object by token index', () => {
    const out = narrow(blocksFor([['in', inPrep], ['galliam', galliam]]), governmentStage);
    expect(out[1].candidates[0].links).toEqual([{ kind: 'government', index: 0 }]);
    expect(out[0].candidates[0].links).toEqual([{ kind: 'government', index: 1 }]);
  });
  it('an object narrowed but not settling the preposition still links to it', () => {
    const out = narrow(blocksFor([['in', inPrep], ['x', ambiguous]]), governmentStage);
    for (const c of out[1].candidates) expect(c.links).toEqual([{ kind: 'government', index: 0 }]);
    expect(out[0].candidates[0].links).toEqual([]);
  });
});
