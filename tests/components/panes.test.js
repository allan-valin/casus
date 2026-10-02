// @vitest-environment jsdom
import { describe, it, expect, vi } from 'vitest';
import { render, fireEvent } from '@testing-library/svelte';
import TextPane from '../../src/app/components/TextPane.svelte';
import Block from '../../src/app/components/Block.svelte';
import { createReader } from '../../src/app/stores/reader.svelte.js';

const lexicon = {
  lookupAll: async (keys) => new Map(keys.map((k) => [k, k === 'xyzzy' ? [] : [
    { lemma: `${k}:noun:1`, pos: 'noun', case: 'nom', number: 'sg', gender: 'f' },
    { lemma: `${k}:noun:1`, pos: 'noun', case: 'abl', number: 'sg', gender: 'f' },
  ]])),
};
const ALL = { nominal: true, verb: true, function: true, classes: false };

describe('TextPane', () => {
  it('renders every sentence and dims the ones not selected', async () => {
    const reader = createReader({ lexicon, text: 'Rosa bona. Urbs magna.' });
    await reader.load();
    const { container } = render(TextPane, { reader, hovered: null });
    const sentences = container.querySelectorAll('.sentence');
    expect(sentences).toHaveLength(2);
    expect(sentences[1].classList.contains('dimmed')).toBe(true);
    await fireEvent.click(sentences[1]);
    expect(reader.selected).toBe(1);
  });

  it('highlights the hovered word of the selected sentence and keeps its punctuation', async () => {
    const reader = createReader({ lexicon, text: 'Rosa, bona.' });
    await reader.load();
    const { container } = render(TextPane, { reader, hovered: 2 });
    const hot = container.querySelector('.hot');
    expect(hot.textContent).toBe('bona');
    expect(container.querySelector('.sentence').textContent.replace(/\s+/g, ' ').trim()).toBe('Rosa, bona.');
  });
});

describe('Block', () => {
  const block = (cands, extra = {}) => ({ token: { index: 2, surface: 'rosa' }, candidates: cands, pinned: null, resolved: cands.length === 1, ...extra });
  const cand = (c) => ({ analysis: { lemma: '1', pos: 'noun', case: c, number: 'sg', gender: 'f' }, reasons: [] });

  it('shows the surface, the superscript index and the badge', () => {
    const { container } = render(Block, { block: block([cand('acc')]), layers: ALL, onhover: () => {}, onopen: () => {} });
    expect(container.textContent).toContain('rosa');
    expect(container.querySelector('.index').textContent).toBe('3');
    expect(container.querySelector('.badge').textContent).toBe('Ac');
    expect(container.querySelector('.pill').classList.contains('striped')).toBe(false);
  });

  it('stripes an ambiguous block and marks a pinned one', () => {
    const b = block([cand('nom'), cand('abl')], { pinned: { pos: 'noun', case: 'nom' } });
    const { container } = render(Block, { block: b, layers: ALL, onhover: () => {}, onopen: () => {} });
    const pill = container.querySelector('.pill');
    expect(pill.classList.contains('striped')).toBe(true);
    expect(pill.classList.contains('pinned')).toBe(true);
    expect(container.querySelector('.badge').textContent).toBe('?');
  });

  it('renders an unknown word as unknown and still opens', async () => {
    const onopen = vi.fn();
    const { container } = render(Block, { block: block([]), layers: ALL, onhover: () => {}, onopen });
    const pill = container.querySelector('.pill');
    expect(pill.classList.contains('unknown')).toBe(true);
    expect(container.querySelector('.badge').textContent).toBe('!');
    await fireEvent.click(pill);
    expect(onopen).toHaveBeenCalledTimes(1);
  });

  it('reports hover with its token index and null on leave', async () => {
    const onhover = vi.fn();
    const { container } = render(Block, { block: block([cand('nom')]), layers: ALL, onhover, onopen: () => {} });
    const pill = container.querySelector('.pill');
    await fireEvent.mouseEnter(pill);
    await fireEvent.mouseLeave(pill);
    expect(onhover.mock.calls).toEqual([[2], [null]]);
  });
});

describe('Block class sub-layer', () => {
  const ALL = { nominal: true, verb: true, function: true, classes: false };
  const b = { token: { index: 0, surface: 'rosa' }, pinned: null, resolved: true,
    candidates: [{ analysis: { lemma: '1', pos: 'noun', case: 'nom', number: 'sg', gender: 'f' }, reasons: [] }] };
  it('shows the class badge only when that layer is on', () => {
    const off = render(Block, { block: b, layers: ALL, onhover: () => {}, onopen: () => {} });
    expect(off.container.querySelector('.class')).toBe(null);
    const on = render(Block, { block: b, layers: { ...ALL, classes: true }, lemmaOf: () => ({ pos: 'noun', decl: 1, gender: 'f' }), onhover: () => {}, onopen: () => {} });
    expect(on.container.querySelector('.class').textContent).toBe('1 f');
  });
});
