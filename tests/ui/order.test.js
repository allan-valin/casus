import { describe, it, expect } from 'vitest';
import { initialOrder, move, autoSort, sortKey } from '../../src/app/lib/order.js';

const b = (index, cands) => ({ token: { index, surface: `w${index}` }, candidates: cands.map((a) => ({ analysis: a, reasons: [] })), pinned: null, resolved: cands.length === 1 });
const n = (c) => ({ pos: 'noun', case: c, number: 'sg', gender: 'f' });

describe('order', () => {
  it('starts in reading order', () => {
    expect(initialOrder([b(0, [n('nom')]), b(1, [n('acc')])])).toEqual([0, 1]);
  });
  it('moves a token to a position', () => {
    expect(move([0, 1, 2, 3], 3, 1)).toEqual([0, 3, 1, 2]);
    expect(move([0, 1, 2], 0, 2)).toEqual([1, 2, 0]);
  });
  it('sorts same-case blocks together, stable by original index', () => {
    const blocks = [b(0, [n('nom')]), b(1, [n('acc')]), b(2, [n('nom')]), b(3, [{ pos: 'verb' }]), b(4, [n('acc')])];
    expect(autoSort([4, 3, 2, 1, 0], blocks)).toEqual([0, 2, 1, 4, 3]);
  });
  it('groups an ambiguous block by its first candidate and says so in the key', () => {
    const amb = b(0, [n('abl'), n('nom')]);
    expect(sortKey(amb)).toBe('?abl');
    expect(sortKey(b(1, [n('gen')]))).toBe('gen');
    expect(sortKey(b(2, []))).toBe('unknown');
    expect(sortKey(b(3, [{ pos: 'conj' }]))).toBe('function');
  });
  it('puts the case groups in the spec order and the rest after', () => {
    const blocks = [b(0, [{ pos: 'verb' }]), b(1, [n('abl')]), b(2, [n('nom')]), b(3, []), b(4, [{ pos: 'prep' }])];
    expect(autoSort([0, 1, 2, 3, 4], blocks)).toEqual([2, 1, 0, 4, 3]);
  });
});
