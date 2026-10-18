// @vitest-environment jsdom
import { describe, it, expect, vi } from 'vitest';
import { render, fireEvent } from '@testing-library/svelte';
import { tick } from 'svelte';
import Drills from '../../src/app/components/Drills.svelte';
import { getLanguage } from '../../src/lang/registry.js';

/* Allan, 2026-10-18: "letter drill" becomes "drills": pick the language there, then its drills; Latin and German
 * get grammar drills for noun and verb endings. */
const rosa = { id: '1', headword: 'rosa', dict_form: 'rosa, -ae f.', pos: 'noun', gloss: 'rose', rows: [['rosa', 'nnsf', 'nvsf', 'nbsf'], [4, 'e', 'ngsf', 'ndsf', 'nnpf', 'nvpf'], [4, 'm', 'nasf']] };
const amo = { id: '2', headword: 'amo', dict_form: 'amo, -are', pos: 'verb', gloss: 'love', rows: [['amo', 'v1spia1'], [2, 'as', 'v2spia1'], [2, 'at', 'v3spia1']] };
const loadModels = async () => [rosa, amo];
const tick2 = async () => { await tick(); await new Promise((r) => setTimeout(r, 0)); await tick(); };

describe('Drills page', () => {
  it('offers every language with drills, the current one selected, and navigates on change', async () => {
    const go = vi.fn();
    const { container } = render(Drills, { lang: getLanguage('la'), loadModels, navigate: go });
    const select = container.querySelector('select.drill-language');
    expect([...select.options].map((o) => o.value)).toEqual(expect.arrayContaining(['la', 'grc', 'de']));
    expect(select.value).toBe('la');
    await fireEvent.change(select, { target: { value: 'grc' } });
    expect(go).toHaveBeenCalledWith('/grc/drills/');
  });
  it('Latin has noun and verb drills but no letters; Greek has letters too', async () => {
    const la = render(Drills, { lang: getLanguage('la'), loadModels, navigate: () => {} });
    expect([...la.container.querySelectorAll('.drill-tab')].map((b) => b.dataset.drill)).toEqual(['nouns', 'verbs']);
    const grc = render(Drills, { lang: getLanguage('grc'), loadModels, navigate: () => {} });
    expect([...grc.container.querySelectorAll('.drill-tab')].map((b) => b.dataset.drill)).toEqual(['letters', 'nouns', 'verbs']);
  });
  it('the noun drill shows the table blank; a right answer turns its cell right', async () => {
    const { container } = render(Drills, { lang: getLanguage('la'), loadModels, navigate: () => {}, random: () => 0 });
    await tick2();
    expect(container.querySelector('.drill-word').textContent).toMatch(/rosa, -ae f\./);
    const gen = container.querySelector('input[data-cell="gen|sg"]');
    await fireEvent.input(gen, { target: { value: 'rosae' } });
    await fireEvent.keyDown(gen, { key: 'Enter' });
    await tick();
    expect(container.querySelector('[data-cell-box="gen|sg"]').classList.contains('right')).toBe(true);
  });
  it('the verb tab drills the verb', async () => {
    const { container } = render(Drills, { lang: getLanguage('la'), loadModels, navigate: () => {}, random: () => 0 });
    await tick2();
    await fireEvent.click(container.querySelector('.drill-tab[data-drill="verbs"]'));
    await tick2();
    expect(container.querySelector('.drill-word').textContent).toMatch(/amo/);
    expect(container.querySelector('input[data-cell="3|sg"]')).not.toBe(null);
  });
});

describe('cheat sheet (Allan, 2026-10-18: a button near the top for all tables)', () => {
  it('nouns: every model word’s table, open', async () => {
    const { container } = render(Drills, { lang: getLanguage('la'), loadModels, navigate: () => {} });
    await tick2();
    await fireEvent.click(container.querySelector('button.cheatsheet'));
    await tick();
    const sheet = document.querySelector('.cheat');
    expect(sheet.textContent).toMatch(/rosa, -ae f\./);
    expect(sheet.textContent).not.toMatch(/amo/);
    expect(sheet.querySelector('td[data-cell="gen|sg"]').textContent).toBe('rosae');
  });
  it('letters: the whole alphabet with names and sounds', async () => {
    const { container } = render(Drills, { lang: getLanguage('grc'), loadModels, navigate: () => {} });
    await tick2();
    await fireEvent.click(container.querySelector('button.cheatsheet'));
    await tick();
    const rows = [...document.querySelectorAll('.cheat tr.letter')];
    expect(rows.length).toBeGreaterThanOrEqual(24);
    expect(rows[0].textContent).toMatch(/α.*Α.*alpha.*a/s);
  });
});
