// @vitest-environment jsdom
import { describe, it, expect, vi } from 'vitest';
import { render, fireEvent } from '@testing-library/svelte';
import Dictionary from '../../src/app/components/Dictionary.svelte';
import { createReader } from '../../src/app/stores/reader.svelte.js';

const lexicon = {
  lookupAll: async (keys) => new Map(keys.map((k) => [k, k === 'xyzzy' ? [] : [
    { lemma: '7', pos: 'noun', case: 'nom', number: 'sg', gender: 'f' },
    { lemma: '7', pos: 'noun', case: 'abl', number: 'sg', gender: 'f' },
  ]])),
};
const extras = {
  lemmas: { 7: { headword: 'rosa', dict_form: 'rosa, -ae f.', pos: 'noun', decl: 1, gender: 'f', age: 'F', freq: 'B' } },
  glosses: { en: { 7: 'rose' }, pt: null },
};

async function readerWith(text, glossLang = 'en', era = 'classical') {
  const reader = createReader({ lexicon, text });
  await reader.load();
  reader.lexiconExtras = extras;
  reader.glossLang = glossLang;
  reader.era = era;
  return reader;
}

describe('Dictionary', () => {
  it('shows the dictionary form, class, gloss, age and frequency', async () => {
    const reader = await readerWith('Rosa.');
    const { container } = render(Dictionary, { block: reader.blocks[0], reader, onclose: () => {} });
    expect(container.textContent).toContain('rosa, -ae f.');
    expect(container.textContent).toMatch(/1st declension/);
    expect(container.textContent).toContain('rose');
    expect(container.querySelector('.gloss-lang').textContent).toBe('en');
    expect(container.textContent).toMatch(/medieval/);
    expect(container.textContent).toMatch(/freq B/);
  });

  it('falls back to English with the badge flipped when Portuguese is asked for and missing', async () => {
    const reader = await readerWith('Rosa.', 'pt');
    const { container } = render(Dictionary, { block: reader.blocks[0], reader, onclose: () => {} });
    expect(container.querySelector('.gloss-lang').textContent).toBe('en (no pt)');
    expect(container.textContent).toContain('rose');
  });

  it('dims an entry outside the era and prints the warning', async () => {
    const reader = await readerWith('Rosa.', 'en', 'classical');
    const { container } = render(Dictionary, { block: reader.blocks[0], reader, onclose: () => {} });
    expect(container.querySelector('.entry').classList.contains('dim-out')).toBe(true);
    expect(container.querySelector('.warning').textContent).toMatch(/only attested as medieval/);
  });

  it('handles a word with no lemma without crashing', async () => {
    const reader = await readerWith('Xyzzy.');
    const { container } = render(Dictionary, { block: reader.blocks[0], reader, onclose: () => {} });
    expect(container.textContent).toMatch(/not in lexicon/i);
  });

  it('shows a loading note while the lemma table is not there yet', async () => {
    const reader = createReader({ lexicon, text: 'Rosa.' });
    await reader.load();
    const { container } = render(Dictionary, { block: reader.blocks[0], reader, onclose: () => {} });
    expect(container.textContent).toMatch(/loading/i);
  });
});

describe('Dictionary keyboard', () => {
  it('closes on Escape and takes focus when opened', async () => {
    const reader = await readerWith('Rosa.');
    const onclose = vi.fn();
    const { container } = render(Dictionary, { block: reader.blocks[0], reader, onclose });
    const dialog = container.querySelector('.dictionary');
    expect(document.activeElement).toBe(dialog);
    await fireEvent.keyDown(dialog, { key: 'Escape' });
    expect(onclose).toHaveBeenCalledTimes(1);
  });
});
