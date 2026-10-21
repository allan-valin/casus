import { describe, it, expect } from 'vitest';
import { getLanguage } from '../../src/lang/registry.js';
import { siteOf } from '../../src/sites.js';
import { splitWords } from '../../src/lang/id/stages.js';

describe('Indonesian (2026-10-21, next in the accepted order)', () => {
  it('on Casus Asia, roles not cases', () => {
    const id = getLanguage('id');
    expect(siteOf('id').id).toBe('asia');
    expect(id.inventory.channels.case.values).toEqual(expect.arrayContaining(['sbj', 'obj', 'iobj']));
    expect(id.name.de).toBe('Indonesisch');
  });
  it('clitics and reduplicated plurals read apart when the whole word is unknown', async () => {
    const lexicon = { lookupAll: async (keys) => new Map(keys.map((k) => [k, ['rumah', 'anak'].includes(k) ? [{}] : []])) };
    const t = (w, start) => ({ surface: w, kind: 'word', key: w.toLowerCase(), start, end: start + w.length, enclitic: null });
    const out = await splitWords([t('Rumahnya', 0), t('anak-anak', 9)], lexicon);
    expect(out.map((x) => x.key)).toEqual(['rumah', 'nya', 'anak']);
  });
});
