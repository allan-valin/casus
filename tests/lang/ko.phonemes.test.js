import { describe, it, expect } from 'vitest';
import { phonemeIds } from '../../src/lang/ko/phonemes.js';

// the Korean Piper voice (kss) reads espeak-ng IPA; the course carries each line's sounds (tools/ko_sounds.py)
describe('Korean sounds for the kss voice (2026-10-28)', () => {
  const map = { '^': [1], _: [0], $: [2], k: [10], ɐ: [11], ˈ: [12], ' ': [3] };
  it('turns the course’s IPA into ids: start, pad between, end; unknown symbols skipped', () => {
    expect(phonemeIds('kˈɐ@', map, { ipa: true })).toEqual([1, 0, 10, 0, 12, 0, 11, 0, 2]);
  });
  it('plain hangul has no sounds in the browser: it says so instead of reading garbage', () => {
    expect(() => phonemeIds('가요', map)).toThrow(/course/);
  });
});
