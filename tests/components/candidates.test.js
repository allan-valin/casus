// @vitest-environment jsdom
import { describe, it, expect } from 'vitest';
import { render, fireEvent } from '@testing-library/svelte';
import Candidates from '../../src/app/components/Candidates.svelte';
import { createReader } from '../../src/app/stores/reader.svelte.js';

const lexicon = {
  lookupAll: async (keys) => new Map(keys.map((k) => [k, [
    { lemma: `${k}:noun:1`, pos: 'noun', case: 'nom', number: 'sg', gender: 'f' },
    { lemma: `${k}:noun:1`, pos: 'noun', case: 'abl', number: 'sg', gender: 'f' },
  ]])),
};

describe('Candidates', () => {
  it('lists every candidate with its reasons', async () => {
    const reader = createReader({ lexicon, text: 'Rosa bona.' });
    await reader.load();
    const { container } = render(Candidates, { block: reader.blocks[0], reader });
    const items = container.querySelectorAll('ul.candidates > li');
    expect(items).toHaveLength(2);
    expect(items[0].textContent).toContain('noun nom sg f');
    expect(items[0].textContent).toContain('lexicon: attested form');
  });

  it('pins a candidate and offers to unpin it', async () => {
    const reader = createReader({ lexicon, text: 'Rosa bona.' });
    await reader.load();
    const { container, rerender } = render(Candidates, { block: reader.blocks[0], reader });
    await fireEvent.click(container.querySelectorAll('button.pin')[1]);
    expect(reader.blocks[0].pinned.case).toBe('abl');
    await rerender({ block: reader.blocks[0], reader });
    expect(container.querySelectorAll('ul.candidates > li')).toHaveLength(1);
    expect(container.textContent).toMatch(/pinned/);
    await fireEvent.click(container.querySelector('button.unpin'));
    expect(reader.blocks[0].pinned).toBe(null);
  });

  it('says so for a word not in the lexicon', async () => {
    const reader = createReader({ lexicon: { lookupAll: async (keys) => new Map(keys.map((k) => [k, []])) }, text: 'Xyzzy.' });
    await reader.load();
    const { container } = render(Candidates, { block: reader.blocks[0], reader });
    expect(container.textContent).toMatch(/not in lexicon/i);
  });
});

describe('Candidates folds identical readings', () => {
  it('shows one row with a count when two lemmas give the same reading, reasons and headword', async () => {
    const twice = {
      lookupAll: async (keys) => new Map(keys.map((k) => [k, [
        { lemma: '1', pos: 'prep', governs: 'acc' },
        { lemma: '2', pos: 'prep', governs: 'acc' },
        { lemma: '3', pos: 'noun', case: 'nom', number: 'sg', gender: 'f' },
      ]])),
    };
    const reader = createReader({ lexicon: twice, text: 'In.' });
    await reader.load();
    reader.lexiconExtras = { lemmas: { 1: { dict_form: 'in' }, 2: { dict_form: 'in' }, 3: { dict_form: 'in, -is f.' } }, glosses: { en: null, pt: null } };
    const { container } = render(Candidates, { block: reader.blocks[0], reader });
    const rows = [...container.querySelectorAll('ul.candidates > li')];
    expect(rows).toHaveLength(2);
    expect(rows[0].textContent).toMatch(/×2/);
    expect(rows[0].textContent).toContain('<in>');
  });
  it('pinning a folded row pins its first analysis', async () => {
    const twice = { lookupAll: async (keys) => new Map(keys.map((k) => [k, [
      { lemma: '1', pos: 'prep', governs: 'acc' }, { lemma: '2', pos: 'prep', governs: 'acc' }]])) };
    const reader = createReader({ lexicon: twice, text: 'In.' });
    await reader.load();
    const { container } = render(Candidates, { block: reader.blocks[0], reader });
    await fireEvent.click(container.querySelector('button.pin'));
    expect(reader.blocks[0].pinned.lemma).toBe('1');
  });
});
