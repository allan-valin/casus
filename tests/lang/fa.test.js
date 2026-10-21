import { describe, it, expect } from 'vitest';
import { getLanguage } from '../../src/lang/registry.js';
import { siteOf } from '../../src/sites.js';
import { stripFa } from '../../src/lang/fa/script.js';
import { roleStage } from '../../src/lang/fa/stages.js';

const blk = (key, analyses) => ({ token: { key, surface: key }, candidates: analyses.map((analysis) => ({ analysis, reasons: [], links: [] })), pinned: false });

describe('Persian (2026-10-21, next in the accepted order)', () => {
  it('on Casus Asia, right to left; keys drop vowel marks and the non-joiner, fold Arabic ي ك', () => {
    const fa = getLanguage('fa');
    expect(siteOf('fa').id).toBe('asia');
    expect(fa.script.rtl).toBe(true);
    expect(stripFa('مَن')).toBe('من');
    expect(stripFa('می‌روم')).toBe('میروم');
    expect(stripFa('كتاب')).toBe('کتاب');
  });
  it('roles: subject first, را marks the object, the verb is last', () => {
    const out = roleStage([blk('من', [{ pos: 'pron' }]), blk('کتاب', [{ pos: 'noun' }]), blk('را', [{ pos: 'particle' }]), blk('خواندم', [{ pos: 'verb' }])]);
    expect(out[0].candidates[0].analysis.case).toBe('sbj');
    expect(out[1].candidates[0].analysis.case).toBe('obj');
  });
});
