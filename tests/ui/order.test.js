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

describe('moveItem', () => {
  it('moves every index of an item together to a position counted in tokens', async () => {
    const { moveItem } = await import('../../src/app/lib/order.js');
    expect(moveItem([0, 1, 2, 3, 4], [1, 2], 3)).toEqual([0, 3, 4, 1, 2]);   // chunk to the end
    expect(moveItem([0, 1, 2, 3, 4], [1, 2], 0)).toEqual([1, 2, 0, 3, 4]);   // chunk to the front
    expect(moveItem([0, 1, 2, 3], [3], 1)).toEqual([0, 3, 1, 2]);            // single, same as move
  });
});

import { arrangeBy, WORD_ORDERS } from '../../src/app/lib/order.js';

describe('arrangeBy (feedback C7: SVO, SOV, VSO, VOS, OVS, OSV)', () => {
  const noun = (index, c, extra = {}) => ({ token: { index }, candidates: [{ analysis: { pos: 'noun', case: c, number: 'sg' } }], ...extra });
  const verb = (index) => ({ token: { index }, candidates: [{ analysis: { pos: 'verb', person: '3', number: 'sg' } }] });
  const prep = (index) => ({ token: { index }, candidates: [{ analysis: { pos: 'prep', governs: ['abl'] } }] });
  // "Galliam Caesar cum legione vicit magnam" : O S prep abl V adj(acc)
  const blocks = [noun(0, 'acc'), noun(1, 'nom'), prep(2), noun(3, 'abl'), verb(4), noun(5, 'acc')];
  const order = [0, 1, 2, 3, 4, 5];

  it('lists the six orders', () => {
    expect(WORD_ORDERS).toEqual(['SVO', 'SOV', 'VSO', 'VOS', 'OVS', 'OSV']);
  });
  it('puts subject (nominative), verb and object (accusative) in the pattern, each group in text order, the rest after', () => {
    expect(arrangeBy(order, blocks, 'SVO')).toEqual([1, 4, 0, 5, 2, 3]);
    expect(arrangeBy(order, blocks, 'SOV')).toEqual([1, 0, 5, 4, 2, 3]);
    expect(arrangeBy(order, blocks, 'VSO')).toEqual([4, 1, 0, 5, 2, 3]);
    expect(arrangeBy(order, blocks, 'OSV')).toEqual([0, 5, 1, 4, 2, 3]);
  });
  it('an ambiguous block goes by its first reading, as auto-sort does', () => {
    const amb = { token: { index: 9 }, candidates: [{ analysis: { pos: 'noun', case: 'nom', number: 'sg' } }, { analysis: { pos: 'noun', case: 'abl', number: 'sg' } }] };
    expect(arrangeBy([9, 4], [amb, verb(4)], 'VSO')).toEqual([4, 9]);
  });
  it('is stable: the rest keeps its current (possibly hand-made) order', () => {
    expect(arrangeBy([3, 2, 5, 4, 1, 0], blocks, 'SVO')).toEqual([1, 4, 5, 0, 3, 2]);
  });
});
