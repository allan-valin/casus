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

describe('TextPane checkboxes (Allan, 2026-10-19: add/remove furigana above and transliteration below in the sentences block)', () => {
  it('a checkbox in the panel turns the Latin letters off and on', async () => {
    const { fireEvent } = await import('@testing-library/svelte');
    const reader = createReader({ lexicon, text: 'ὁ λογος.', lang: getLanguage('grc') });
    await reader.load();
    const { container } = render(TextPane, { reader });
    const below = container.querySelector('.pane-toggles input[data-layer="roman"]');
    expect(below.checked).toBe(true);
    await fireEvent.click(below);
    await tick();
    expect(container.querySelector('.text .roman')).toBe(null);
  });
  it('Japanese has the furigana checkbox; Greek the dictionary-spelling one above; Latin none', async () => {
    const ja = createReader({ lexicon, text: '本。', lang: getLanguage('ja') });
    expect(render(TextPane, { reader: ja }).container.querySelector('.pane-toggles input[data-layer="furigana"]')).not.toBe(null);
    const grc = createReader({ lexicon, text: 'ὁ λογος.', lang: getLanguage('grc') });
    expect(render(TextPane, { reader: grc }).container.querySelector('.pane-toggles input[data-layer="marks"]')).not.toBe(null);
    const la = createReader({ lexicon, text: 'Rosa.' });
    expect(render(TextPane, { reader: la }).container.querySelector('.pane-toggles')).toBe(null);
  });
});
