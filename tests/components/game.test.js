// @vitest-environment jsdom
import { describe, it, expect } from 'vitest';
import { render, fireEvent } from '@testing-library/svelte';
import { tick } from 'svelte';
import Game from '../../src/app/components/Game.svelte';
import { getLanguage } from '../../src/lang/registry.js';

describe('Game', () => {
  it('shows a letter, takes an answer, scores it, and offers the rows', async () => {
    const { container } = render(Game, { lang: getLanguage('grc'), random: () => 0 });
    expect(container.querySelector('.letter').textContent.trim()).toBe('α');
    expect(container.querySelectorAll('.rows input[type=checkbox]').length).toBe(6);
    const input = container.querySelector('input.answer');
    await fireEvent.input(input, { target: { value: 'alpha' } });
    await fireEvent.submit(container.querySelector('form'));
    await tick();
    expect(container.querySelector('.score').textContent).toMatch(/1\s*\/\s*1/);
    expect(container.querySelector('.feedback').textContent).toMatch(/alpha/i);
  });
});
