import { describe, it, expect } from 'vitest';
import { SITES, siteOf, siteLanguages, siteUrl } from '../../src/sites.js';
import { langFromPath } from '../../src/app/lib/route.js';
import { LANGUAGES } from '../../src/lang/registry.js';

describe('three sites from one codebase (Allan, 2026-10-19)', () => {
  it('every language belongs to exactly one site; Arabic stays in Casus', () => {
    for (const l of LANGUAGES) expect(Object.values(SITES).filter((s) => s.languages.includes(l.code)).length).toBe(1);
    expect(siteOf('ar').id).toBe('casus');
    expect(siteOf('ja').id).toBe('asia');
    expect(siteOf('mk').id).toBe('world');
  });
  it('a site lists only its languages, in language-bar order', () => {
    expect(siteLanguages(SITES.asia).map((l) => l.code)).toEqual(['ja', 'ko', 'zh']);
    expect(siteLanguages(SITES.casus)[0].code).toBe('la');
  });
  it('a language’s page on its own site', () => {
    expect(siteUrl('ja', 'drills')).toBe('https://allan-valin.github.io/casus-asia/ja/drills/');
    expect(siteUrl('la', 'reader')).toBe('https://allan-valin.github.io/casus/');
    expect(siteUrl('pt', 'proof')).toBe('https://allan-valin.github.io/casus-world/pt/proof/');
  });
  it('Casus World opens on Portuguese', () => {
    expect(siteLanguages(SITES.world)[0].code).toBe('pt');
  });
  it('the root and unknown paths open the site’s first language', () => {
    const asia = siteLanguages(SITES.asia);
    expect(langFromPath('/casus-asia/', '/casus-asia/', asia)).toEqual({ code: 'ja', view: 'reader' });
    expect(langFromPath('/casus-asia/ko/learn/', '/casus-asia/', asia)).toEqual({ code: 'ko', view: 'learn' });
    expect(langFromPath('/casus/', '/casus/')).toEqual({ code: 'la', view: 'reader' });
  });
});
