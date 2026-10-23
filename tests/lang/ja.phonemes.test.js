import { describe, it, expect } from 'vitest';
import { phonemeIds, kanaToIpa } from '../../src/lang/ja/phonemes.js';

/* The natural Japanese voice (Piper hi_fi_captain) reads OpenJTalk sounds in IPA with pitch-accent marks; the course
 * carries them from the build (tools/ja_phonemes.py). Text outside the course falls back to kana → IPA, no accent. */
const MAP = { '^': [1], _: [0], $: [2], '.': [10], '?': [13], '↑': [160], '↓': [159], '#': [161], a: [14], k: [23], ɯ: [76], s: [31], ɕ: [96], i: [21], ɴ: [72], ʔ: [100], t: [32], o: [27], w: [35], ʲ: [123], e: [18], d: [17] };

describe('Japanese sounds for the natural voice', () => {
  it('the course symbols go in as they are, each followed by a pad, between start and end', () => {
    expect(phonemeIds('ka↑sa.', MAP, { ipa: true })).toEqual([1, 0, 23, 0, 14, 0, 160, 0, 31, 0, 14, 0, 10, 0, 2]);
  });
  it('kana outside the course: morae to IPA, small tsu as a closure, ん as ɴ, long vowels doubled', () => {
    expect(kanaToIpa('きょうは')).toBe('kʲooha');
    expect(kanaToIpa('ちょっと')).toBe('tɕoʔto');
    expect(kanaToIpa('ほん')).toBe('hoɴ');
    expect(kanaToIpa('コーヒー')).toBe('koohii');
    expect(kanaToIpa('です。')).toBe('desɯ.');
  });
  it('without symbols from the course, the kana are converted first', () => {
    expect(phonemeIds('かさ', MAP)).toEqual([1, 0, 23, 0, 14, 0, 31, 0, 14, 0, 2]);
  });
});
