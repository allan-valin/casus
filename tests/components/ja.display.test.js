// @vitest-environment jsdom
import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/svelte';
import { tick } from 'svelte';
import Block from '../../src/app/components/Block.svelte';
import TextPane from '../../src/app/components/TextPane.svelte';
import { createReader } from '../../src/app/stores/reader.svelte.js';
import { getLanguage } from '../../src/lang/registry.js';

/* Allan, 2026-10-18: furigana over kanji (NHK Easy), hiragana over katakana, a toggle; spaces after particles. */
const layers = { nominal: true, verb: true, function: true, classes: false, marks: true, roman: true, furigana: true };
const block = { token: { index: 0, surface: '行きました', key: '行きました' }, furi: [['行', 'い'], ['きました', null]], roman: 'ikimashita',
  candidates: [{ analysis: { lemma: '1', pos: 'verb', form: 'politepast' }, reasons: [], links: [] }], pinned: null };

describe('Japanese display', () => {
  it('the block puts the reading over the kanji and romaji under the word', () => {
    const { container } = render(Block, { block, layers, onhover: () => {}, onopen: () => {}, romanize: (s) => s });
    expect(container.querySelector('.surface ruby rt').textContent).toBe('い');
    expect(container.querySelector('.surface').textContent.replace(/い(?=き)/, '')).toMatch(/行きました/);
    expect(container.querySelector('.roman').textContent).toBe('ikimashita');
  });
  it('the furigana toggle takes it away', () => {
    const { container } = render(Block, { block, layers: { ...layers, furigana: false }, onhover: () => {}, onopen: () => {}, romanize: (s) => s });
    expect(container.querySelector('ruby')).toBe(null);
  });
  it('the sentences panel: furigana over kanji words, a gap after particles and verbs', async () => {
    const LEX = { 私: [{ lemma: '1', pos: 'pron', reading: 'わたし' }], は: [{ lemma: '2', pos: 'particle' }], 行きます: [{ lemma: '3', pos: 'verb', form: 'polite', reading: 'いきます' }] };
    const lexicon = { lookupAll: async (keys) => new Map(keys.map((k) => [k, LEX[k] ?? []])) };
    const reader = createReader({ lexicon, text: '私は行きます。', lang: getLanguage('ja') });
    await reader.load();
    const { container } = render(TextPane, { reader });
    await tick();
    expect(container.querySelector('.word ruby rt').textContent).toBe('わたし');
    const words = [...container.querySelectorAll('.word')];
    expect(words.map((w) => w.classList.contains('gap'))).toEqual([false, true, true]);
    expect([...container.querySelectorAll('.text .roman')].map((r) => r.textContent)).toEqual(['watashi', 'wa', 'ikimasu']);
  });
});
