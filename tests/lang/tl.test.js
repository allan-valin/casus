import { describe, it, expect } from 'vitest';
import { getLanguage } from '../../src/lang/registry.js';
import { siteOf } from '../../src/sites.js';
import { roleStage, linkerBase } from '../../src/lang/tl/stages.js';
import { stripTl } from '../../src/lang/tl/script.js';

const blk = (key, analyses, kind = 'word') => ({ token: { key, surface: key, kind }, candidates: analyses.map((analysis) => ({ analysis, reasons: [], links: [] })), pinned: false });

describe('Tagalog (2026-10-21, last of the accepted order)', () => {
  it('on Casus Asia; keys drop the dictionary stress marks', () => {
    expect(siteOf('tl').id).toBe('asia');
    expect(getLanguage('tl').name.pt).toBe('Tagalo');
    expect(stripTl('aklát')).toBe('aklat');
    expect(stripTl('bumasâ')).toBe('bumasa');
  });
  it('the markers give the roles: ang topic, ng non-topic, sa oblique', () => {
    const out = roleStage([blk('bumasa', [{ pos: 'verb' }]), blk('ang', [{ pos: 'particle' }]), blk('bata', [{ pos: 'noun' }]),
      blk('ng', [{ pos: 'particle' }]), blk('aklat', [{ pos: 'noun' }]), blk('sa', [{ pos: 'prep' }]), blk('bahay', [{ pos: 'noun' }])]);
    expect([2, 4, 6].map((i) => out[i].candidates[0].analysis.case)).toEqual(['top', 'ng', 'obl']);
  });
  it('the linker -ng is read apart', () => {
    expect(linkerBase('wikang')).toEqual(['wika', 'wikan']);
    expect(linkerBase('aklat')).toEqual([]);
  });
});
