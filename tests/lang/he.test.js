import { describe, it, expect } from 'vitest';
import { getLanguage } from '../../src/lang/registry.js';
import { siteOf } from '../../src/sites.js';
import { stripHe } from '../../src/lang/he/script.js';
import { tokenize, prefixCuts, splitWords } from '../../src/lang/he/tokenize.js';
import { atStage } from '../../src/lang/he/stages.js';

describe('Hebrew (2026-10-21, next in the accepted order)', () => {
  it('on Casus World, right to left, named in every interface language', () => {
    const he = getLanguage('he');
    expect(siteOf('he').id).toBe('world');
    expect(he.script.rtl).toBe(true);
    expect(he.name.de).toBe('Hebräisch'); expect(he.name.ar).toBe('العبرية');
  });
  it('keys drop the vowel points and the maqaf (mirror of tools/casus_build/he.py)', () => {
    expect(stripHe('כָּתַבְתִּי')).toBe('כתבתי');
    expect(stripHe('יַלְדֵי־')).toBe('ילדי');
    expect(stripHe('שָׁלוֹם')).toBe('שלום');
  });
  it('words keep their points, geresh and gershayim; punctuation stays apart', () => {
    const t = tokenize('צה"ל שָׁלוֹם, ג\'ירפה.').filter((x) => x.kind === 'word').map((x) => x.key);
    expect(t).toEqual(['צה"ל', 'שלום', "ג'ירפה"]);
  });
  it('prefix cuts follow the order ו ש/כש ב/כ/ל/מ ה, longest first', () => {
    expect(prefixCuts('והבית').map(([p]) => p)).toEqual(['וה', 'ו']);
    expect(prefixCuts('כשהגעתי')[0][0]).toBe('כשה');
    expect(prefixCuts('בית')).toEqual([['ב', 'ית']]);
  });
  it('a word the dictionary lacks is split when the rest is known: וּבַבַּיִת → ו + ב + בית', async () => {
    const lexicon = { lookupAll: async (keys) => new Map(keys.map((k) => [k, k === 'בית' ? [{ pos: 'noun' }] : []])) };
    const out = await splitWords(tokenize('ובבית'), lexicon);
    expect(out.map((x) => x.key)).toEqual(['ו', 'ב', 'בית']);
    expect(out.slice(0, 2).every((x) => x.proclitic)).toBe(true);
  });
  it('את before a noun marks the direct object', () => {
    const block = (key, analyses) => ({ token: { key, surface: key }, candidates: analyses.map((analysis) => ({ analysis, reasons: [], links: [] })), pinned: false });
    const out = atStage([block('את', [{ lemma: 'את', pos: 'prep' }, { lemma: 'את', pos: 'pron' }]), block('הספר', [{ lemma: 1, pos: 'noun' }])]);
    expect(out[0].candidates.map((c) => c.analysis.pos)).toEqual(['prep']);
    expect(out[1].candidates[0].analysis.case).toBe('obj');
  });
});

describe('the maqaf', () => {
  it('joins two words for the stress only: they are read apart', () => {
    expect(tokenize('אֶל־חַלּוֹנִי').filter((x) => x.kind === 'word').map((x) => x.key)).toEqual(['אל', 'חלוני']);
  });
});
