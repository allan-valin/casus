import { describe, it, expect } from 'vitest';
import { ipaAr } from '../../src/lang/ar/ipa.js';
import { expectedFor } from '../../src/app/lib/pronounce.js';
import { getLanguage } from '../../src/lang/registry.js';

// Allan 2026-10-28: "هي معلمة" — مُعَلِّمَة has no Wiktionary IPA, so only /hija/ was compared. Measured on the
// dictionary's 17,877 headwords with Wiktionary IPA: 93.7 % equal (the rest mostly loanwords and Wiktionary quirks).
describe('Arabic IPA from the vowelled spelling', () => {
  it('writes words alone the way Wiktionary does', () => {
    expect(ipaAr('مُعَلِّمَة')).toBe('muʕallima');
    expect(ipaAr('مُعَلِّمٌ')).toBe('muʕallim');                    // pausal: no case ending
    expect(ipaAr('هِيَ')).toBe('hija');
    expect(ipaAr('مُضِيفَة')).toBe('mudˤiːfa');
    expect(ipaAr('اِسْم')).toBe('ism');                             // connecting alif
    expect(ipaAr('مَرْحَبًا')).toBe('marħaban');
    expect(ipaAr('الشَّمْسُ')).toBe('aʃʃams');
    expect(ipaAr('جَزَائِيّ')).toBe('d͡ʒazaːʔijj');
  });
  it('keeps endings inside a sentence, and gives nothing for unvowelled text', () => {
    expect(ipaAr('فَضْلِكِ', { pausal: false })).toBe('fadˤliki');
    expect(ipaAr('معلمة')).toBeNull();
  });
  it('the pronunciation compare gets every word of هي معلمة', async () => {
    const lang = getLanguage('ar');
    const lemmas = { 1: { headword: 'هِيَ' }, 2: { headword: 'مُعَلِّمَة' } };
    const index = new Map([['هي', '/hi.ja/']]);
    const lookup = async (w) => (w === 'معلمة' ? [{ lemma: 2 }] : []);
    const out = await expectedFor('هي معلمة', { index, lookup, lemmas, ipa: {}, ruleIpa: lang.script.ruleIpa, strip: lang.script.strip });
    expect(out.map((w) => w.source)).toEqual(['exact', 'form']);
    expect(out[1].ipa).toBe('muʕallima');
  });
});
