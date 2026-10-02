import { describe, it, expect } from 'vitest';
import { ERAS, eraStatus, warning } from '../../src/app/lib/era.js';

describe('era', () => {
  it('lists five periods in order, each owning Whitaker age letters', () => {
    expect(ERAS.map((e) => e.id)).toEqual(['archaic', 'classical', 'late', 'medieval', 'neo']);
    expect(ERAS.find((e) => e.id === 'classical').ages).toEqual(['C']);
    expect(ERAS.flatMap((e) => e.ages).sort()).toEqual(['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H']);
  });
  it('an unknown age is never dimmed', () => {
    expect(eraStatus('X', 'classical')).toBe('unknown');
  });
  it('an age in the period is in, a neighbouring one is near, a distant one is out', () => {
    expect(eraStatus('C', 'classical')).toBe('in');
    expect(eraStatus('B', 'classical')).toBe('near');
    expect(eraStatus('D', 'classical')).toBe('near');
    expect(eraStatus('F', 'classical')).toBe('out');
    expect(eraStatus('A', 'neo')).toBe('out');
  });
  it('warns when a word is only attested far from the text', () => {
    expect(warning('F', 'classical')).toMatch(/medieval/i);
    expect(warning('C', 'classical')).toBe(null);
    expect(warning('X', 'classical')).toBe(null);
  });
});
