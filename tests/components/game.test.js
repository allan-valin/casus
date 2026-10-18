// @vitest-environment jsdom
import { describe, it, expect } from 'vitest';
import { render, fireEvent } from '@testing-library/svelte';
import { tick } from 'svelte';
import Game from '../../src/app/components/Game.svelte';
import { getLanguage } from '../../src/lang/registry.js';
import { ROWS } from '../../src/lang/grc/game.js';

const ALL = ROWS.flatMap((r) => r.items).length;

describe('Game page', () => {
  it('opens on the all-letters grid with sound typing first, rows for small letters and capitals', async () => {
    const { container } = render(Game, { lang: getLanguage('grc'), random: () => 0.5 });
    const modes = [...container.querySelectorAll('.modes input[type=radio][name=answer]')];
    expect(modes.map((m) => m.value)).toEqual(['sound', 'name']);
    expect(modes[0].checked).toBe(true);
    expect(container.querySelectorAll('.rows input[type=checkbox]').length).toBe(11);
    expect(container.querySelector('input[value=capitals]')).toBe(null);           // no more "mix in capitals"
    // every row ticked by default (Allan, 2026-10-18)
    expect([...container.querySelectorAll('.rows input[type=checkbox]')].every((c) => c.checked)).toBe(true);
    expect(container.querySelectorAll('.grid .cell').length).toBe(ALL);
  });
  it('fills a grid cell and marks it', async () => {
    const { container } = render(Game, { lang: getLanguage('grc'), random: () => 0.5, shuffle: false });
    const cell = container.querySelectorAll('.grid .cell')[0];
    expect(cell.querySelector('.glyph').textContent).toBe('α');
    const input = cell.querySelector('input');
    await fireEvent.input(input, { target: { value: 'a' } });
    await fireEvent.keyDown(input, { key: 'Enter' });
    await tick();
    expect(cell.classList.contains('right')).toBe(true);
    expect(container.querySelector('.score').textContent).toMatch(new RegExp(`1\\s*/\\s*${ALL}`));
  });
  it('select all / unselect all', async () => {
    const { container } = render(Game, { lang: getLanguage('grc'), random: () => 0.5 });
    await fireEvent.click(container.querySelector('button.rows-none'));
    await tick();
    expect([...container.querySelectorAll('.rows input[type=checkbox]')].some((c) => c.checked)).toBe(false);
    expect(container.querySelectorAll('.grid .cell').length).toBe(0);
    await fireEvent.click(container.querySelector('button.rows-all'));
    await tick();
    expect(container.querySelectorAll('.grid .cell').length).toBe(ALL);
  });
  it('still offers the one-letter view', async () => {
    const { container } = render(Game, { lang: getLanguage('grc'), random: () => 0 });
    await fireEvent.click(container.querySelector('input[name=view][value=single]'));
    await tick();
    expect(container.querySelector('.letter').textContent.trim()).toBe('α');
  });
});
