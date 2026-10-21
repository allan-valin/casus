import { describe, it, expect } from 'vitest';
import { getLanguage } from '../../src/lang/registry.js';
import { siteOf } from '../../src/sites.js';
import { postpositionStage } from '../../src/lang/hi/stages.js';

describe('Hindi (2026-10-21, next in the accepted order)', () => {
  it('on Casus Asia; sentences end at the danda; Devanagari words keep their vowel signs', () => {
    const hi = getLanguage('hi');
    expect(siteOf('hi').id).toBe('asia');
    expect(hi.segment('मैं घर जाता हूँ। तुम कहाँ हो?').map((s) => s.text)).toEqual(['मैं घर जाता हूँ।', 'तुम कहाँ हो?']);
    expect(hi.tokenize('लड़के ने किताब पढ़ी।').filter((t) => t.kind === 'word').map((t) => t.key)).toEqual(['लड़के', 'ने', 'किताब', 'पढ़ी']);
  });
  it('a noun before a postposition keeps its oblique readings', () => {
    const blk = (key, analyses) => ({ token: { key, surface: key }, candidates: analyses.map((analysis) => ({ analysis, reasons: [], links: [] })), pinned: false });
    const out = postpositionStage([blk('लड़के', [{ pos: 'noun', case: 'dir', number: 'pl' }, { pos: 'noun', case: 'obl', number: 'sg' }]), blk('ने', [{ pos: 'prep' }])]);
    expect(out[0].candidates.map((c) => c.analysis.case)).toEqual(['obl']);
  });
});
