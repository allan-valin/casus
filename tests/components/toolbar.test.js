// @vitest-environment jsdom
import { describe, it, expect, vi } from 'vitest';
import { render, fireEvent } from '@testing-library/svelte';
import PassagePicker from '../../src/app/components/PassagePicker.svelte';
import LayerToggles from '../../src/app/components/LayerToggles.svelte';
import Toolbar from '../../src/app/components/Toolbar.svelte';
import { createReader } from '../../src/app/stores/reader.svelte.js';

const lexicon = { lookupAll: async (keys) => new Map(keys.map((k) => [k, []])) };
const samples = [{ id: 'a', title: 'Sample A', file: 'a.txt', era: 'late' }];
const fetchImpl = vi.fn(async () => ({ ok: true, text: async () => 'Rosa bona.' }));

describe('PassagePicker', () => {
  it('reads pasted text', async () => {
    const onchoose = vi.fn();
    const { container } = render(PassagePicker, { samples, onchoose, fetchImpl });
    await fireEvent.input(container.querySelector('textarea'), { target: { value: 'Urbs magna.' } });
    await fireEvent.click(container.querySelector('button.read'));
    expect(onchoose).toHaveBeenCalledWith('Urbs magna.', null);
  });
  it('calls the button "Identify grammar" and puts the demonstration samples above the text box (feedback D9, D10)', () => {
    const { container } = render(PassagePicker, { samples, onchoose: () => {}, fetchImpl });
    expect(container.querySelector('button.read').textContent).toMatch(/identify grammar/i);
    expect(container.textContent).toMatch(/demonstration/i);
    const all = [...container.querySelectorAll('button.sample, textarea')];
    expect(all[0].tagName).toBe('BUTTON');
    expect(all[all.length - 1].tagName).toBe('TEXTAREA');
  });
  it('fetches a bundled sample and passes its era along', async () => {
    const onchoose = vi.fn();
    const { container } = render(PassagePicker, { samples, onchoose, fetchImpl });
    await fireEvent.click(container.querySelector('button.sample'));
    await new Promise((r) => setTimeout(r, 0));
    expect(fetchImpl).toHaveBeenCalledWith('/samples/a.txt');
    expect(onchoose).toHaveBeenCalledWith('Rosa bona.', 'late');
  });
});

describe('LayerToggles', () => {
  it('flips the reader layers', async () => {
    const reader = createReader({ lexicon, text: 'Rosa.' });
    const { container } = render(LayerToggles, { reader });
    const boxes = container.querySelectorAll('input[type=checkbox]');
    expect(boxes).toHaveLength(4);
    await fireEvent.click(boxes[1]);
    expect(reader.layers.verb).toBe(false);
    expect(boxes[3].checked).toBe(false); // classes off by default
  });
});

describe('Toolbar', () => {
  it('says "Dictionary period" and "Dictionary language" and which one is active (feedback D13, D18)', async () => {
    const reader = createReader({ lexicon, text: 'Rosa.' });
    await reader.load();
    const { container } = render(Toolbar, { reader });
    expect(container.textContent).toMatch(/Dictionary period/);
    expect(container.textContent).toMatch(/Dictionary language/);
    expect(container.querySelector('select.era option[value=classical]').textContent).toMatch(/Classical Latin/);
    expect(container.textContent).toMatch(/English/);
  });
  it('sets era and gloss language', async () => {
    const reader = createReader({ lexicon, text: 'Rosa.' });
    await reader.load();
    const { container } = render(Toolbar, { reader });
    await fireEvent.change(container.querySelector('select.era'), { target: { value: 'medieval' } });
    expect(reader.era).toBe('medieval');
    await fireEvent.change(container.querySelector('select.gloss'), { target: { value: 'pt' } });
    expect(reader.glossLang).toBe('pt');
  });
});
