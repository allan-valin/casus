// @vitest-environment jsdom
import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/svelte';
import { tick } from 'svelte';
import TextPane from '../../src/app/components/TextPane.svelte';
import { createReader } from '../../src/app/stores/reader.svelte.js';
import { getLanguage } from '../../src/lang/registry.js';

/* Allan, 2026-10-18: the transliteration also in the sentences panel, for every non-Latin language. */
const lexicon = { lookupAll: async (keys) => new Map(keys.map((k) => [k, k === 'λογος' ? [{ lemma: '1', pos: 'noun', case: 'nom', number: 'sg', gender: 'm', marked: 'λόγος' }] : []])) };

describe('TextPane transliteration', () => {
  it('puts Latin letters under every word of every sentence', async () => {
    const reader = createReader({ lexicon, text: 'ὁ λογος. ἐν ἀρχῇ.', lang: getLanguage('grc') });
    await reader.load();
    const { container } = render(TextPane, { reader });
    const romans = [...container.querySelectorAll('.roman')].map((e) => e.textContent);
    expect(romans).toEqual(['ho', 'logos', 'en', 'archēi']);
  });
  it('the layer toggle hides it, and Latin has none', async () => {
    const reader = createReader({ lexicon, text: 'ὁ λογος.', lang: getLanguage('grc') });
    await reader.load();
    reader.layers.roman = false;
    const { container } = render(TextPane, { reader });
    await tick();
    expect(container.querySelector('.roman')).toBe(null);
    const la = createReader({ lexicon: { lookupAll: async (k) => new Map(k.map((x) => [x, []])) }, text: 'Rosa bona.' });
    await la.load();
    expect(render(TextPane, { reader: la }).container.querySelector('.roman')).toBe(null);
  });
});
