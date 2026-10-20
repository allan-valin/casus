// @vitest-environment jsdom
import { describe, it, expect } from 'vitest';
import { render, fireEvent } from '@testing-library/svelte';
import { tick } from 'svelte';
import TypeDrill from '../../src/app/components/TypeDrill.svelte';
import { getLanguage } from '../../src/lang/registry.js';

/* Typed recall (drills research 2026-10-20, item 6): see the meaning, type the word; marks are forgiven and shown. */
describe('TypeDrill', () => {
  it('checks a typed answer, forgiving missing accents, and moves on', async () => {
    const results = [];
    const items = [{ prompt: 'house', answer: 'σπίτι' }, { prompt: 'water', answer: 'νερό' }];
    const { container } = render(TypeDrill, { items, lang: getLanguage('el'), random: () => 0, onresult: (i, ok) => results.push(ok) });
    await tick();
    const unaccented = { house: 'σπιτι', water: 'νερο' };
    const full = { house: 'σπίτι', water: 'νερό' };
    const first = container.querySelector('.type-prompt').textContent.trim();
    await fireEvent.input(container.querySelector('input.type-answer'), { target: { value: unaccented[first] } });
    await fireEvent.click(container.querySelector('button.type-check'));
    expect(container.querySelector('.type-feedback').textContent).toContain(full[first]);
    expect(results).toEqual([true]);
    await fireEvent.click(container.querySelector('button.next'));
    const second = container.querySelector('.type-prompt').textContent.trim();
    expect(second).not.toBe(first);
    await fireEvent.input(container.querySelector('input.type-answer'), { target: { value: 'κρασί' } });
    await fireEvent.click(container.querySelector('button.type-check'));
    expect(results).toEqual([true, false]);
    expect(container.querySelector('.type-feedback').textContent).toContain(full[second]);
  });
});
