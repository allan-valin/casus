import { describe, it, expect } from 'vitest';
import { getLanguage } from '../../src/lang/registry.js';
import { siteOf } from '../../src/sites.js';
import { splitWords } from '../../src/lang/vi/stages.js';

describe('Vietnamese (2026-10-21, next in the accepted order)', () => {
  it('on Casus Asia, roles not cases', () => {
    const vi = getLanguage('vi');
    expect(siteOf('vi').id).toBe('asia');
    expect(vi.name.de).toBe('Vietnamesisch');
  });
  it('syllables join into the longest word the dictionary knows', async () => {
    const lexicon = { lookupAll: async (keys) => new Map(keys.map((k) => [k, ['học sinh', 'việt nam'].includes(k) ? [{}] : []])) };
    const toks = getLanguage('vi').tokenize('Tôi là học sinh ở Việt Nam.');
    const out = await splitWords(toks, lexicon);
    expect(out.filter((t) => t.kind === 'word').map((t) => t.key)).toEqual(['tôi', 'là', 'học sinh', 'ở', 'việt nam']);
  });
});
