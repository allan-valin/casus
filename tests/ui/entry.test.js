import { describe, it, expect } from 'vitest';
import { pickIpa, displayForm } from '../../src/app/lib/entry.js';

describe('pickIpa', () => {
  const v = [{ ipa: 'A', tags: ['5th BCE Attic'] }, { ipa: 'E', tags: ['1st CE Egyptian'] }, { ipa: 'K', tags: ['4th CE Koine'] }];
  it('honours the order of the period’s preferred tags, not the order of the variants', () => {
    expect(pickIpa(v, ['4th CE Koine', '1st CE Egyptian']).ipa).toBe('K');
  });
  it('falls back to the first variant', () => {
    expect(pickIpa(v, ['nope']).ipa).toBe('A');
    expect(pickIpa([], ['x'])).toBe(null);
  });
});

describe('displayForm', () => {
  it('writes a lookup key back with final sigma', () => {
    expect(displayForm('λόγοσ')).toBe('λόγος');
    expect(displayForm('σοφόσ')).toBe('σοφός');
    expect(displayForm('rosa')).toBe('rosa');
  });
});
