// @vitest-environment jsdom
import { describe, it, expect, beforeAll } from 'vitest';
import { render, fireEvent } from '@testing-library/svelte';
import { tick } from 'svelte';

// jsdom has no Web Animations API; animate:flip asks for it when the pool re-flows
beforeAll(() => { Element.prototype.getAnimations ??= () => []; });
import BlockPane from '../../src/app/components/BlockPane.svelte';
import { createReader } from '../../src/app/stores/reader.svelte.js';

const analyses = {
  in: [{ lemma: '1', pos: 'prep' }],
  galliam: [{ lemma: '2', pos: 'noun', case: 'acc', number: 'sg', gender: 'f' }],
  magnam: [{ lemma: '3', pos: 'adj', case: 'acc', number: 'sg', gender: 'f' }, { lemma: '3', pos: 'adj', case: 'gen', number: 'pl', gender: 'f' }],
  caesar: [{ lemma: '4', pos: 'noun', case: 'nom', number: 'sg', gender: 'm' }, { lemma: '4', pos: 'noun', case: 'voc', number: 'sg', gender: 'm' }],
};
const lexicon = { lookupAll: async (keys) => new Map(keys.map((k) => [k, analyses[k] ?? []])) };

describe('BlockPane', () => {
  it('renders a glued chunk for in + Galliam and single blocks for the rest', async () => {
    const reader = createReader({ lexicon, text: 'Caesar in Galliam magnam.' });
    await reader.load();
    const { container } = render(BlockPane, { reader, onhover: () => {}, onopen: () => {} });
    expect(container.querySelectorAll('.item')).toHaveLength(3);
    const chunk = container.querySelector('.chunk');
    expect(chunk.textContent).toMatch(/in.*Galliam/s);
  });

  it('unglues and re-glues a chunk', async () => {
    const reader = createReader({ lexicon, text: 'Caesar in Galliam magnam.' });
    await reader.load();
    const { container } = render(BlockPane, { reader, onhover: () => {}, onopen: () => {} });
    await fireEvent.click(container.querySelector('button.unglue'));
    await tick();
    expect(reader.unglued.has(1)).toBe(true);
    expect(container.querySelectorAll('.item')).toHaveLength(4);
    await fireEvent.click(container.querySelector('button.glue'));
    await tick();
    expect(reader.unglued.has(1)).toBe(false);
    expect(container.querySelectorAll('.item')).toHaveLength(3);
  });

  it('marks agreement partners while a block is hovered', async () => {
    const reader = createReader({ lexicon, text: 'Caesar in Galliam magnam.' });
    await reader.load();
    const { container } = render(BlockPane, { reader, onhover: () => {}, onopen: () => {} });
    const pills = [...container.querySelectorAll('.pill')];
    const magnam = pills.find((p) => p.textContent.includes('magnam'));
    await fireEvent.mouseEnter(magnam);
    const galliam = pills.find((p) => p.textContent.includes('Galliam'));
    expect(galliam.closest('.block').classList.contains('linked')).toBe(true);
  });

  it('follows the reader order and offers restore and auto-sort', async () => {
    const reader = createReader({ lexicon, text: 'Caesar in Galliam magnam.' });
    await reader.load();
    reader.move(3, 0);
    const { container } = render(BlockPane, { reader, onhover: () => {}, onopen: () => {} });
    expect(container.querySelector('.item .pill').textContent).toContain('magnam');
    await fireEvent.click(container.querySelector('button.restore'));
    expect(reader.order).toEqual([0, 1, 2, 3]);
    await fireEvent.click(container.querySelector('button.autosort'));
    expect(reader.order).toEqual([0, 2, 3, 1]);
  });
});
