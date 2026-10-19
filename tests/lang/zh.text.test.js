import { describe, it, expect } from 'vitest';
import { pinyinSyllables } from '../../src/lang/zh/pinyin.js';

describe('pinyin syllables and their tones (for colour)', () => {
  it.each([
    ['xuéxiào', [['xué', 2], ['xiào', 4]]], ['Zhōngguó', [['Zhōng', 1], ['guó', 2]]], ['wǒ', [['wǒ', 3]]], ['xǐhuan', [['xǐ', 3], ['huan', 0]]],
    ['nǐ hǎo', [['nǐ', 3], [' ', null], ['hǎo', 3]]], ["Xī'ān", [['Xī', 1], ["'", null], ['ān', 1]]], ['péngyou', [['péng', 2], ['you', 0]]], ['lǜshī', [['lǜ', 4], ['shī', 1]]],
  ])('%s', (p, out) => expect(pinyinSyllables(p)).toEqual(out));
});
