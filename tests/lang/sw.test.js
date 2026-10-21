import { describe, it, expect } from 'vitest';
import { getLanguage } from '../../src/lang/registry.js';
import { siteOf } from '../../src/sites.js';
import { withoutObject } from '../../src/lang/sw/stages.js';

describe('Swahili (2026-10-21, next in the accepted order)', () => {
  it('on Casus World, roles not cases', () => {
    expect(siteOf('sw').id).toBe('world');
    expect(getLanguage('sw').name.pt).toBe('Suaíli');
  });
  it('an object prefix after the tense marker is dropped for the lookup', () => {
    expect(withoutObject('alinipa')).toBe('alipa');
    expect(withoutObject('ninakisoma')).toBe('ninasoma');
    expect(withoutObject('soma')).toBe(null);
  });
});
