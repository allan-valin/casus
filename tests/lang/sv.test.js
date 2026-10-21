import { describe, it, expect } from 'vitest';
import { getLanguage } from '../../src/lang/registry.js';
import { siteOf } from '../../src/sites.js';
import { subjectPronounStage } from '../../src/lang/sv/stages.js';

describe('Swedish (2026-10-21, last of the accepted order lt, he, sh, ro, sv)', () => {
  it('on Casus World, roles not cases, named in every interface language', () => {
    const sv = getLanguage('sv');
    expect(siteOf('sv').id).toBe('world');
    expect(sv.inventory.channels.case.values).toEqual(expect.arrayContaining(['sbj', 'obj', 'iobj']));
    expect(sv.name.de).toBe('Schwedisch'); expect(sv.name.mk).toBe('шведски');
  });
  it('a subject pronoun after the verb is still the subject (verb second: Idag läser jag)', () => {
    const b = { token: { key: 'jag', surface: 'jag' }, candidates: [{ analysis: { lemma: 'jag', pos: 'pron', case: 'obj' }, reasons: [], links: [] }], pinned: false };
    expect(subjectPronounStage([b])[0].candidates[0].analysis.case).toBe('sbj');
  });
});
