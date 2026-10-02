import { describe, it, expect } from 'vitest';
import { gluePairs, partners, items } from '../../src/app/lib/chunks.js';

const b = (index, surface, pos, links = []) => ({
  token: { index, surface, key: surface.toLowerCase() }, pinned: null, resolved: true,
  candidates: [{ analysis: { pos, case: 'acc', number: 'sg', gender: 'f', governs: pos === 'prep' ? ['acc'] : undefined }, reasons: ['lexicon: attested form'], links }],
});
const sentence = [
  b(0, 'Caesar', 'noun'),
  b(1, 'in', 'prep', [{ kind: 'government', index: 2 }]),
  b(2, 'Galliam', 'noun', [{ kind: 'government', index: 1 }]),
  b(3, 'magnam', 'adj', [{ kind: 'agreement', index: 2 }]),
  b(4, 'venit', 'verb'),
];

describe('gluePairs', () => {
  it('glues a preposition to the adjacent object the cascade named', () => {
    expect([...gluePairs(sentence)]).toEqual([[1, 2]]);
  });
  it('does not glue an unglued preposition', () => {
    expect(gluePairs(sentence, new Set([1])).size).toBe(0);
  });
  it('glues nothing when the object was not settled by this preposition', () => {
    const loose = sentence.map((x) => (x.token.index === 2 ? { ...x, candidates: [{ ...x.candidates[0], links: [] }] } : x));
    expect(gluePairs(loose).size).toBe(0);
  });
  it('glues only the adjacent object, never one two words away', () => {
    const far = [b(0, 'in', 'prep', [{ kind: 'government', index: 2 }]), b(1, 'magnam', 'adj'), b(2, 'urbem', 'noun', [{ kind: 'government', index: 0 }])];
    expect(gluePairs(far).size).toBe(0);
  });
});

describe('partners', () => {
  it('links an adjective to the token its agreement reason names, both ways', () => {
    const p = partners(sentence);
    expect(p.get(3)).toEqual([2]);
    expect(p.get(2)).toEqual([3]);
    expect(p.get(0)).toBeUndefined();
  });
  it('is empty for a sentence where nothing agrees', () => {
    expect(partners([b(0, 'Rosa', 'noun'), b(1, 'urbem', 'noun')]).size).toBe(0);
  });
});

describe('items', () => {
  it('turns the order into pool items, a glued pair being one item', () => {
    const out = items(sentence, [0, 1, 2, 3, 4], gluePairs(sentence));
    expect(out.map((i) => i.indices)).toEqual([[0], [1, 2], [3], [4]]);
    expect(out[1].id).toBe('1+2');
  });
  it('keeps the object with its preposition even if the order separated them', () => {
    const out = items(sentence, [2, 0, 1, 3, 4], gluePairs(sentence));
    expect(out.map((i) => i.indices)).toEqual([[1, 2], [0], [3], [4]]);
  });
});

describe('partners with a repeated surface', () => {
  it('links exactly the witness the cascade named, by index, even when the surface repeats', () => {
    const deus = (i) => b(i, 'Deus', 'noun');
    const p = partners([deus(0), b(1, 'bonus', 'adj', [{ kind: 'agreement', index: 0 }]), b(2, 'et', 'conj'), deus(3), b(4, 'malus', 'adj', [{ kind: 'agreement', index: 3 }])]);
    expect(p.get(1)).toEqual([0]);
    expect(p.get(0)).toEqual([1]);
    expect(p.get(4)).toEqual([3]);
  });
});
