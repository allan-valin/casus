import { describe, it, expect } from 'vitest';
import codesFixture from '../fixtures/codes.de.json';
import { getLanguage, LANGUAGES } from '../../src/lang/registry.js';
import { decodeAnalysis } from '../../src/lib/lexicon.js';

const de = getLanguage('de');

describe('German definition', () => {
  it('is registered at /de/ with its sources and voice', () => {
    expect(LANGUAGES.find((l) => l.code === 'de')).toMatchObject({ path: '/de/', name: { en: 'German', pt: 'Alemão' } });
    expect(de.wiktionary).toBe('German');
    expect(de.bcp47).toBe('de');
    expect(de.voice.espeak).toBe('de');
    expect(de.inventory.channels.case.values).toEqual(['nom', 'gen', 'dat', 'acc']);
    expect(de.inventory.showArticle).toBe(true);
    expect(de.government.in).toEqual(['acc', 'dat']);
    expect(de.governmentPhrase).toBe(true);
  });
  it('mirrors the Python code tables', () => {
    expect(de.inventory.codes.json).toEqual(codesFixture);
    expect(decodeAnalysis('adsmwp', '1', de.inventory.codes)).toEqual({ lemma: '1', pos: 'adj', case: 'dat', number: 'sg', gender: 'm', infl: 'weak', degree: 'pos' });
  });
  it('does not end sentences at abbreviations or ordinals', () => {
    expect(de.segment('Er kam am 3. Oktober, z. B. mit dem Zug. Gut!').map((s) => s.text)).toEqual(['Er kam am 3. Oktober, z. B. mit dem Zug.', 'Gut!']);
  });
  it('gives a capitalised sentence-initial word a small-letter alternative key, and only that word', () => {
    const words = de.tokenize('Essen ist gut, Essen.').filter((t) => t.kind === 'word');
    expect(words[0]).toMatchObject({ key: 'Essen', altKey: 'essen' });
    expect(words[1].altKey).toBe(undefined);
    expect(words[3].altKey).toBe(undefined);
  });
  it('reads the old spelling daß as dass and keeps umlauts, ß and hyphenated compounds', () => {
    const words = de.tokenize('daß Maße E-Mail').filter((t) => t.kind === 'word');
    expect(words.map((w) => w.key)).toEqual(['dass', 'Maße', 'E-Mail']);
  });
});
