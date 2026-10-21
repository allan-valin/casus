import { describe, it, expect } from 'vitest';
import { getLanguage } from '../../src/lang/registry.js';
import { siteOf } from '../../src/sites.js';

describe('Bengali (2026-10-21, next in the accepted order)', () => {
  it('on Casus Asia; Bengali words keep their vowel signs; sentences end at the danda', () => {
    const bn = getLanguage('bn');
    expect(siteOf('bn').id).toBe('asia');
    expect(bn.segment('আমি বই পড়ি। তুমি কোথায়?').map((s) => s.text)).toEqual(['আমি বই পড়ি।', 'তুমি কোথায়?']);
    expect(bn.tokenize('ছেলেটা বাড়িতে আছে।').filter((t) => t.kind === 'word').map((t) => t.key)).toEqual(['ছেলেটা', 'বাড়িতে', 'আছে']);
    expect(bn.name.de).toBe('Bengalisch');
  });
});
