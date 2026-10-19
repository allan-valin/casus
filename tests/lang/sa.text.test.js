import { describe, it, expect } from 'vitest';
import { romanizeSa, cleanSa } from '../../src/lang/sa/script.js';

describe('Sanskrit', () => {
  it.each([['देवः', 'devaḥ'], ['अश्वः', 'aśvaḥ'], ['गच्छति', 'gacchati'], ['संस्कृतम्', 'saṃskṛtam'], ['रामः', 'rāmaḥ'], ['ज्ञानम्', 'jñānam'], ['कृष्णः', 'kṛṣṇaḥ']])(
    '%s → %s', (d, r) => expect(romanizeSa(d)).toBe(r));
  it('keys drop Vedic accents and footnote digits', () => expect(cleanSa('अश्वा॑1')).toBe('अश्वा'));
});
import { getLanguage } from '../../src/lang/registry.js';
describe('Sanskrit text', () => {
  it('a final anusvara is the final m (वनं = वनम्)', () => expect(cleanSa('वनं')).toBe('वनम्'));
  it('sentences end at the danda', () => expect(getLanguage('sa').segment('रामः वनं गच्छति। बालकः पठति॥').map((s) => s.text)).toEqual(['रामः वनं गच्छति।', 'बालकः पठति॥']));
});
describe('Sanskrit nasals', () => {
  it('a class nasal before its consonant is the anusvara (सञ्जय = संजय)', () => expect(cleanSa('सञ्जय')).toBe(cleanSa('संजय')));
});
