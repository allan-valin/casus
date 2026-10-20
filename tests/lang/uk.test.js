import { describe, it, expect } from 'vitest';
import { getLanguage } from '../../src/lang/registry.js';
import { siteOf } from '../../src/sites.js';

describe('Ukrainian, Italian, Dutch are registered (2026-10-20, proposal accepted)', () => {
  it('Ukrainian: seven cases on the base Casus site; Italian and Dutch on Casus World', () => {
    const uk = getLanguage('uk');
    expect(uk.inventory.channels.case.values).toEqual(expect.arrayContaining(['nom', 'gen', 'dat', 'acc', 'ins', 'loc', 'voc']));
    expect(siteOf('uk').id).toBe('casus'); expect(siteOf('it').id).toBe('world'); expect(siteOf('nl').id).toBe('world');
    expect(getLanguage('it').noNounEndings).toBe(true);
    expect(getLanguage('nl').noNounEndings).toBe(true);
  });
});
