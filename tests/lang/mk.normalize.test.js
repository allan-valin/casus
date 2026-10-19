import { describe, it, expect } from 'vitest';
import { getLanguage } from '../../src/lang/registry.js';

describe('Macedonian text', () => {
  it('a Latin j typed inside a Cyrillic word is the Cyrillic ј; Latin words keep theirs', () => {
    const n = getLanguage('mk').script.normalize;
    expect(n('моjот јас')).toBe('мојот јас');
    expect(n('jazz')).toBe('jazz');
  });
});
