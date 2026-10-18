// @vitest-environment jsdom
import { describe, it, expect } from 'vitest';
import { render, fireEvent } from '@testing-library/svelte';
import { tick } from 'svelte';
import ChoiceDrill from '../../src/app/components/ChoiceDrill.svelte';

/* Allan, 2026-10-19: keys pick an answer, Enter confirms it (and then goes on). */
const items = ['a', 'b', 'c', 'd', 'e'].map((x) => ({ prompt: x, answer: x.toUpperCase() }));

describe('ChoiceDrill keyboard', () => {
  it('each choice shows its key; 1–4 select, Enter confirms, Enter again goes on', async () => {
    const { container } = render(ChoiceDrill, { items, random: () => 0 });
    await tick();
    const buttons = [...container.querySelectorAll('button.choice')];
    expect(buttons.map((b) => b.querySelector('.key').textContent)).toEqual(['1', '2', '3', '4']);
    const prompt = container.querySelector('.quiz-prompt').textContent.trim();
    const k = buttons.findIndex((b) => b.querySelector('.text').textContent.trim() === prompt.toUpperCase());
    await fireEvent.keyDown(window, { key: String(k + 1) });
    await tick();
    expect(container.querySelectorAll('button.choice')[k].classList.contains('selected')).toBe(true);
    expect(container.querySelector('.quiz-feedback')).toBe(null);                   // selected, not yet answered
    await fireEvent.keyDown(window, { key: 'Enter' });
    await tick();
    expect(container.querySelector('.quiz-feedback').classList.contains('right')).toBe(true);
    await fireEvent.keyDown(window, { key: 'Enter' });
    await tick();
    expect(container.querySelector('.quiz-feedback')).toBe(null);
    expect(container.querySelector('.score').textContent).toMatch(/1\s*\/\s*1/);
  });
  it('arrow keys move the selection; a click still answers at once', async () => {
    const { container } = render(ChoiceDrill, { items, random: () => 0 });
    await tick();
    await fireEvent.keyDown(window, { key: 'ArrowDown' });
    await fireEvent.keyDown(window, { key: 'ArrowDown' });
    await tick();
    expect(container.querySelectorAll('button.choice')[1].classList.contains('selected')).toBe(true);
    await fireEvent.click(container.querySelectorAll('button.choice')[2]);
    await tick();
    expect(container.querySelector('.quiz-feedback')).not.toBe(null);
  });
  it('keys typed into a field elsewhere are left alone', async () => {
    const { container } = render(ChoiceDrill, { items, random: () => 0 });
    const input = document.createElement('input');
    document.body.appendChild(input);
    await fireEvent.keyDown(input, { key: '1' });
    await tick();
    expect(container.querySelector('button.choice.selected')).toBe(null);
    input.remove();
  });
});

describe('ChoiceDrill: what a saying means beyond its words (Allan, 2026-10-19: memento mori)', () => {
  it('after answering: literally, other senses, and the Wikipedia note with its source', async () => {
    const items = [{ prompt: 'memento mori', answer: 'Do not forget that you are only human.', literally: 'Be mindful of dying.', more: ['a reminder of death'],
      wiki: { title: 'Memento mori', text: 'Memento mori is an artistic symbol or trope acting as a reminder of the inevitability of death.' } },
    { prompt: 'carpe diem', answer: 'seize the day' }];
    const { container } = render(ChoiceDrill, { items, random: () => 0 });
    await tick();
    expect(container.querySelector('.about')).toBe(null);
    await fireEvent.click(container.querySelector('button.choice'));
    await tick();
    const about = container.querySelector('.about');
    expect(about.textContent).toMatch(/Be mindful of dying/);
    expect(about.textContent).toMatch(/a reminder of death/);
    expect(about.textContent).toMatch(/inevitability of death/);
    expect(about.querySelector('a').getAttribute('href')).toBe('https://en.wikipedia.org/wiki/Memento_mori');
  });
});

describe('ChoiceDrill: a note written for Casus is shown, labelled as such', () => {
  it('after answering', async () => {
    const items = [{ prompt: 'ad kalendas Graecas', answer: 'never', note: 'The Greek calendar had no calends, so that date never comes.' }, { prompt: 'x', answer: 'y' }];
    const { container } = render(ChoiceDrill, { items, random: () => 0 });
    await fireEvent.click(container.querySelector('button.choice'));
    await tick();
    const note = container.querySelector('.about .casus-note');
    expect(note.textContent).toMatch(/no calends/);
    expect(note.textContent).toMatch(/written for Casus/i);
  });
});
