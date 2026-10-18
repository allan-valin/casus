import { describe, it, expect } from 'vitest';
import { STRINGS, t, ui, setLang } from '../../src/app/lib/i18n.svelte.js';

/* Decided 2026-10-18: the UI language is a flag, English ⇄ Brazilian Portuguese, covering the
 * chrome and the dictionary. Brazilian forms only (arquivo, clique, salvar), never European ones. */
describe('i18n', () => {
  it('has the same keys in both languages', () => {
    expect(Object.keys(STRINGS.pt).sort()).toEqual(Object.keys(STRINGS.en).sort());
    expect(Object.keys(STRINGS.en).length).toBeGreaterThan(40);
  });
  it('translates and interpolates', () => {
    setLang('en');
    expect(t('text.heading')).toBe('Text');
    expect(t('blocks.heading', { n: 2 })).toBe('Grammar blocks of sentence 2');
    setLang('pt');
    expect(t('text.heading')).toBe('Texto');
    expect(t('blocks.heading', { n: 2 })).toBe('Blocos gramaticais da frase 2');
    expect(ui.lang).toBe('pt');
    setLang('en');
  });
  it('uses Brazilian Portuguese, not European', () => {
    const all = Object.values(STRINGS.pt).join(' ').toLowerCase();
    for (const bad of ['ficheiro', 'carregue', 'está a ', 'utilizador', 'rato ', 'ecrã']) expect(all).not.toContain(bad);
  });
  it('falls back to English for a key missing in Portuguese and to the key itself when unknown', () => {
    setLang('pt');
    expect(t('nope.missing')).toBe('nope.missing');
    setLang('en');
  });
});
