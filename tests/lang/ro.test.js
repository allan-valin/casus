import { describe, it, expect } from 'vitest';
import { getLanguage } from '../../src/lang/registry.js';
import { siteOf } from '../../src/sites.js';
import { stripRo } from '../../src/lang/ro/script.js';
import { splitWords } from '../../src/lang/ro/tokenize.js';

describe('Romanian (2026-10-21, next in the accepted order)', () => {
  it('five cases on the base Casus site; prepositions with theirs', () => {
    const ro = getLanguage('ro');
    expect(siteOf('ro').id).toBe('casus');
    expect(ro.inventory.channels.case.values).toEqual(expect.arrayContaining(['nom', 'acc', 'gen', 'dat', 'voc']));
    expect(ro.government.cu).toEqual(['acc']); expect(ro.government.împotriva).toEqual(['gen']); expect(ro.government.datorită).toEqual(['dat']);
    expect(ro.name.de).toBe('Rumänisch');
  });
  it('the old cedilla letters key like the comma ones', () => {
    expect(stripRo('Şi')).toBe('și'); expect(stripRo('părinţi')).toBe('părinți');
  });
  it('a hyphenated contraction the dictionary lacks is read as its words: ca-n = ca în', async () => {
    const lexicon = { lookupAll: async (keys) => new Map(keys.map((k) => [k, ['ca', 'în', 'mândră'].includes(k) ? [{}] : []])) };
    const t = [{ surface: 'ca-n', kind: 'word', key: 'ca-n', start: 0, end: 4, enclitic: null }];
    const out = await splitWords(t, lexicon);
    expect(out.map((x) => [x.surface, x.key])).toEqual([['ca', 'ca'], ['n', 'în']]);
  });
});
