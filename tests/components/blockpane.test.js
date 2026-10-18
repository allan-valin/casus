// @vitest-environment jsdom
import { describe, it, expect, beforeAll, vi } from 'vitest';
import { render, fireEvent } from '@testing-library/svelte';
import { tick } from 'svelte';

// jsdom has no Web Animations API; animate:flip asks for it when the pool re-flows
beforeAll(() => {
  Element.prototype.getAnimations ??= () => [];
  // jsdom has no PointerEvent: a MouseEvent that carries pointerType and pointerId is enough for the pane
  if (typeof window.PointerEvent === 'undefined') {
    window.PointerEvent = class PointerEvent extends MouseEvent {
      constructor(type, init = {}) { super(type, init); this.pointerType = init.pointerType ?? 'mouse'; this.pointerId = init.pointerId ?? 1; }
    };
  }
});
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

describe('BlockPane drag: caret preview, move on release (feedback D17)', () => {
  // jsdom lays nothing out: give the three items boxes on one row, 100 px apart
  function layout(container) {
    [...container.querySelectorAll('.item')].forEach((el, i) => {
      el.getBoundingClientRect = () => ({ x: i * 110, y: 0, width: 100, height: 40, left: i * 110, top: 0, right: i * 110 + 100, bottom: 40 });
    });
    container.querySelector('.pool').getBoundingClientRect = () => ({ x: 0, y: 0, width: 400, height: 60, left: 0, top: 0, right: 400, bottom: 60 });
  }
  it('keeps every block still while dragging, shows a caret at the aimed gap, and moves on release', async () => {
    const reader = createReader({ lexicon, text: 'Caesar in Galliam magnam.' });
    await reader.load();
    const { container } = render(BlockPane, { reader, onhover: () => {}, onopen: () => {} });
    await tick();
    layout(container);
    const before = [...container.querySelectorAll('.item')].map((e) => e.textContent);
    const chunk = container.querySelector('.item.chunk .pill');
    await fireEvent.pointerDown(chunk, { clientX: 160, clientY: 20, pointerId: 1, pointerType: 'mouse', button: 0 });
    await fireEvent.pointerMove(container.querySelector('.pool'), { clientX: 330, clientY: 20, pointerId: 1 });
    await tick();
    expect([...container.querySelectorAll('.item')].map((e) => e.textContent)).toEqual(before);   // nothing slid
    expect(container.querySelector('.caret')).not.toBe(null);
    expect(container.querySelector('.item.lifting')).not.toBe(null);
    expect(reader.order).toEqual([0, 1, 2, 3]);
    await fireEvent.pointerUp(container.querySelector('.pool'), { clientX: 330, clientY: 20, pointerId: 1 });
    await tick();
    expect(reader.order).toEqual([0, 3, 1, 2]);
    expect(container.querySelector('.caret')).toBe(null);
    expect([...container.querySelectorAll('.item')].map((e) => e.classList.contains('chunk'))).toEqual([false, false, true]);
  });
  it('a press without movement is a click: the dictionary opens and nothing moves', async () => {
    const reader = createReader({ lexicon, text: 'Caesar in Galliam magnam.' });
    await reader.load();
    const onopen = vi.fn();
    const { container } = render(BlockPane, { reader, onhover: () => {}, onopen });
    await tick();
    layout(container);
    const pill = container.querySelector('.pill');
    await fireEvent.pointerDown(pill, { clientX: 50, clientY: 20, pointerId: 1, pointerType: 'mouse', button: 0 });
    await fireEvent.pointerMove(container.querySelector('.pool'), { clientX: 52, clientY: 21, pointerId: 1 });
    await fireEvent.pointerUp(container.querySelector('.pool'), { clientX: 52, clientY: 21, pointerId: 1 });
    await fireEvent.click(pill);
    expect(onopen).toHaveBeenCalledTimes(1);
    expect(reader.order).toEqual([0, 1, 2, 3]);
  });
  it('moves a block with the keyboard: Alt+ArrowRight / Alt+ArrowLeft on a focused pill', async () => {
    const reader = createReader({ lexicon, text: 'Caesar in Galliam magnam.' });
    await reader.load();
    const { container } = render(BlockPane, { reader, onhover: () => {}, onopen: () => {} });
    await tick();
    await fireEvent.keyDown(container.querySelector('.pill'), { key: 'ArrowRight', altKey: true });
    await tick();
    expect(reader.order).toEqual([1, 2, 0, 3]);
    await fireEvent.keyDown([...container.querySelectorAll('.pill')].find((p) => p.textContent.includes('Caesar')), { key: 'ArrowLeft', altKey: true });
    await tick();
    expect(reader.order).toEqual([0, 1, 2, 3]);
  });
});

describe('BlockPane accessibility', () => {
  it('names the glue buttons for screen readers', async () => {
    const reader = createReader({ lexicon, text: 'Caesar in Galliam magnam.' });
    await reader.load();
    const { container } = render(BlockPane, { reader, onhover: () => {}, onopen: () => {} });
    expect(container.querySelector('button.unglue').getAttribute('aria-label')).toMatch(/unglue/i);
  });
});

describe('BlockPane says how it sorted', () => {
  it('shows a note after auto-sort naming the rule, and drops it on restore', async () => {
    const reader = createReader({ lexicon, text: 'Caesar in Galliam magnam.' });
    await reader.load();
    const { container } = render(BlockPane, { reader, onhover: () => {}, onopen: () => {} });
    expect(container.querySelector('.sort-note')).toBe(null);
    await fireEvent.click(container.querySelector('button.autosort'));
    await tick();
    expect(container.querySelector('.sort-note').textContent).toMatch(/first reading/i);
    await fireEvent.click(container.querySelector('button.restore'));
    await tick();
    expect(container.querySelector('.sort-note')).toBe(null);
  });
});
