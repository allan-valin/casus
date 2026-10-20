// @vitest-environment jsdom
import { describe, it, expect } from 'vitest';
import { render, fireEvent } from '@testing-library/svelte';
import { tick } from 'svelte';
import ListenDrill from '../../src/app/components/ListenDrill.svelte';
import { getLanguage } from '../../src/lang/registry.js';

/* Listening and dictation (drills research 2026-10-20, items 7 and 9): Learn sentences spoken, not shown. */
const index = { levels: [{ id: 'A1', topics: [{ kind: 'grammar', lessons: [{ id: 'a' }, { id: 'b' }] }] }] };
const lesson = {
  a: { more: [{ text: 'Je mange.', en: 'I eat.' }, { text: 'Il pleut.', en: 'It is raining.' }] },
  b: { more: [{ text: 'Nous partons.', en: 'We leave.' }, { text: 'Elle lit.', en: 'She reads.' }] },
};
const loadData = async (name) => (name === 'learn' ? index : lesson[name.replace('learn/', '')]);
const settle = async () => { for (let i = 0; i < 6; i += 1) { await tick(); await new Promise((r) => setTimeout(r, 0)); } };

describe('ListenDrill', () => {
  it('speaks the sentence without showing it; the meaning is chosen, then the sentence is shown', async () => {
    const spoken = [];
    const results = [];
    const voice = { speak: async (t) => { spoken.push(t); return {}; } };
    const { container } = render(ListenDrill, { lang: getLanguage('fr'), voice, loadData, random: () => 0, onresult: (q, ok) => results.push(ok) });
    await settle();
    await fireEvent.click(container.querySelector('button.listen-play'));
    expect(spoken).toHaveLength(1);
    expect(container.textContent).not.toContain(spoken[0]);
    const meanings = { 'Je mange.': 'I eat.', 'Il pleut.': 'It is raining.', 'Nous partons.': 'We leave.', 'Elle lit.': 'She reads.' };
    const right = [...container.querySelectorAll('button.listen-option')].find((b) => b.textContent.trim() === meanings[spoken[0]]);
    await fireEvent.click(right);
    expect(results).toEqual([true]);
    expect(container.querySelector('.listen-text').textContent).toContain(spoken[0]);
  });
  it('dictation: type what was heard; each word is marked', async () => {
    const spoken = [];
    const voice = { speak: async (t) => { spoken.push(t); return {}; } };
    const { container } = render(ListenDrill, { lang: getLanguage('fr'), voice, loadData, random: () => 0 });
    await settle();
    await fireEvent.click(container.querySelector('button[data-mode="dictation"]'));
    await fireEvent.click(container.querySelector('button.listen-play'));
    const words = spoken.at(-1).replace('.', '').split(' ');
    await fireEvent.input(container.querySelector('input.listen-answer'), { target: { value: words[0] } });
    await fireEvent.click(container.querySelector('button.listen-check'));
    const marks = [...container.querySelectorAll('.listen-word')].map((w) => w.classList.contains('right'));
    expect(marks).toEqual([true, false]);
  });
});
