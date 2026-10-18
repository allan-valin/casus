// @vitest-environment jsdom
import { describe, it, expect } from 'vitest';
import { render, fireEvent } from '@testing-library/svelte';
import { tick } from 'svelte';
import Drills from '../../src/app/components/Drills.svelte';
import Paradigm from '../../src/app/components/Paradigm.svelte';
import ChoiceDrill from '../../src/app/components/ChoiceDrill.svelte';
import { getLanguage } from '../../src/lang/registry.js';
import { romanizeGrc } from '../../src/lang/grc/romanize.js';

/* Allan, 2026-10-19: in the Greek drills, the transliteration too. */
const grc = getLanguage('grc');
const logos = { id: '1', headword: 'λόγος', dict_form: 'λόγος, λόγου m.', pos: 'noun', gloss: { en: 'word' }, pool: [], rows: [['λόγος', 'nnsm'], [3, 'ου', 'ngsm']] };
const tick2 = async () => { await tick(); await new Promise((r) => setTimeout(r, 0)); await tick(); };

describe('Greek drills in Latin letters', () => {
  it('the drill word and an answered cell carry their transliteration', async () => {
    const { container } = render(Drills, { lang: grc, loadData: async (n) => (n === 'drills' ? [logos] : []), navigate: () => {}, random: () => 0 });
    await tick2();
    await fireEvent.click(container.querySelector('.drill-tab[data-drill="nouns"]'));
    await tick2();
    expect(container.querySelector('.drill-word .roman').textContent).toBe('logos');
    const gen = container.querySelector('input[data-cell="gen|sg"]');
    await fireEvent.input(gen, { target: { value: 'λογου' } });
    await fireEvent.keyDown(gen, { key: 'Enter' });
    await tick();
    expect(container.querySelector('[data-cell-box="gen|sg"] .roman').textContent).toBe('logou');
  });
  it('the paradigm tables (cheat sheet, dictionary) put it under each Greek form, Latin none', () => {
    const g = render(Paradigm, { rows: [['λόγος', 'nnsm'], ['λόγου', 'ngsm']], lemma: '1', lang: grc, form: '', openAll: true });
    expect(g.container.querySelector('td[data-cell="gen|sg"] .roman').textContent).toBe('logou');
    const l = render(Paradigm, { rows: [['rosa', 'nnsf']], lemma: '1', lang: getLanguage('la'), form: '', openAll: true });
    expect(l.container.querySelector('.roman')).toBe(null);
  });
  it('quiz: the Greek prompt, Greek choices and the word-by-word chips; English left alone', async () => {
    const items = [
      { prompt: 'γνῶθι σεαυτόν', answer: 'know thyself', lit: [['γνῶθι', 'know'], ['σεαυτόν', 'yourself']] },
      { prompt: 'σπεῦδε βραδέως', answer: 'make haste slowly', lit: [] },
    ];
    const { container } = render(ChoiceDrill, { items, random: () => 0, romanize: romanizeGrc });
    await tick();
    expect(container.querySelector('.quiz-prompt + .roman, .quiz .roman').textContent).toMatch(/gnōthi seauton|speude bradeōs/);
    expect([...container.querySelectorAll('button.choice .roman')]).toHaveLength(0);
    await fireEvent.click(container.querySelector('button.choice'));
    await tick();
    if (container.querySelector('.quiz-prompt').textContent.includes('γνῶθι')) expect(container.querySelector('.lit-word .roman').textContent).toBe('gnōthi');
    const back = render(ChoiceDrill, { items: items.map((i) => ({ prompt: i.answer, answer: i.prompt })), random: () => 0, romanize: romanizeGrc });
    await tick();
    expect(back.container.querySelectorAll('button.choice .roman').length).toBe(2);
  });
});
