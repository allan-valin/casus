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
    expect(container.textContent).toMatch(/medieval/);
    expect(container.textContent).toMatch(/freq B/);
  });

  it('offers one button per dictionary that has the word, under the headword, and opens the preferred one (Allan, 2026-10-18)', async () => {
    const reader = await readerWith('Rosa.', 'pt');
    reader.lexiconExtras = { ...extras, glosses: { en: { 7: 'rose' }, pt: { 7: 'rosa, roseira' } } };
    const { container } = render(Dictionary, { block: reader.blocks[0], reader, onclose: () => {} });
    const tabs = [...container.querySelectorAll('button.dict-tab')];
    expect(tabs.map((b) => b.dataset.dict)).toEqual(['en', 'pt']);
    expect(tabs[1].classList.contains('active')).toBe(true);
    expect(container.querySelector('.gloss').textContent.trim()).toBe('rosa, roseira');
    await fireEvent.click(tabs[0]);
    expect(container.querySelector('.gloss').textContent.trim()).toBe('rose');
    expect(tabs[0].classList.contains('active')).toBe(true);
  });

  it('never switches dictionaries silently: with Portuguese preferred but absent, only the English button shows and it is the one open', async () => {
    const reader = await readerWith('Rosa.', 'pt');
    const { container } = render(Dictionary, { block: reader.blocks[0], reader, onclose: () => {} });
    const tabs = [...container.querySelectorAll('button.dict-tab')];
    expect(tabs.map((b) => b.dataset.dict)).toEqual(['en']);
    expect(tabs[0].classList.contains('active')).toBe(true);
    expect(container.textContent).toContain('rose');
    expect(container.querySelector('.gloss-lang')).toBe(null);
  });

  it('says so when no dictionary has the word', async () => {
    const reader = await readerWith('Rosa.', 'pt');
    reader.lexiconExtras = { ...extras, glosses: { en: {}, pt: {} } };
    const { container } = render(Dictionary, { block: reader.blocks[0], reader, onclose: () => {} });
    expect(container.querySelectorAll('button.dict-tab')).toHaveLength(0);
    expect(container.querySelector('.no-gloss').textContent).toMatch(/not found in any dictionary/i);
    expect(container.textContent).toContain('rosa, -ae f.');   // the form and class still come from Whitaker's lexicon
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

describe('Dictionary IPA and Wiktionary link (languages plan Task 6)', () => {
  const ipaExtras = { ...extras, ipa: { 7: [{ ipa: '[ˈrɔ.sa]', tags: ['Classical-Latin'] }, { ipa: '[ˈrɔː.za]', tags: ['Ecclesiastical'] }] } };
  it('shows the IPA variant that matches the dictionary period', async () => {
    const reader = await readerWith('Rosa.', 'en', 'classical');
    reader.lexiconExtras = ipaExtras;
    const { container } = render(Dictionary, { block: reader.blocks[0], reader, onclose: () => {} });
    expect(container.querySelector('.ipa').textContent).toBe('[ˈrɔ.sa]');
    expect(container.querySelector('.ipa').title).toMatch(/Classical/);
  });
  it('switches to the Ecclesiastical variant for a medieval period', async () => {
    const reader = await readerWith('Rosa.', 'en', 'medieval');
    reader.lexiconExtras = ipaExtras;
    const { container } = render(Dictionary, { block: reader.blocks[0], reader, onclose: () => {} });
    expect(container.querySelector('.ipa').textContent).toBe('[ˈrɔː.za]');
  });
  it('links the entry to its Wiktionary page', async () => {
    const reader = await readerWith('Rosa.');
    const { container } = render(Dictionary, { block: reader.blocks[0], reader, onclose: () => {} });
    expect(container.querySelector('a.wiktionary').getAttribute('href')).toBe('https://en.wiktionary.org/wiki/rosa#Latin');
  });
});

describe('Dictionary speaker (languages plan Task 7)', () => {
  it('has a speaker button that says the headword through the voice it is given', async () => {
    const reader = await readerWith('Rosa.');
    const speak = vi.fn(async () => {});
    const voice = { tier: async () => 'espeak', speak };
    const { container } = render(Dictionary, { block: reader.blocks[0], reader, onclose: () => {}, voice });
    await new Promise((r) => setTimeout(r, 0));
    const button = container.querySelector('button.speaker');
    expect(button.disabled).toBe(false);
    await fireEvent.click(button);
    expect(speak).toHaveBeenCalledWith('rosa');
  });
  it('says so in visible text when speaking fails (touch screens show no tooltips)', async () => {
    const reader = await readerWith('Rosa.');
    const onspoke = vi.fn();
    const voice = { tier: async () => 'espeak', speak: vi.fn(async () => { throw new Error('no voice for la'); }) };
    const { container } = render(Dictionary, { block: reader.blocks[0], reader, onclose: () => {}, voice, onspoke });
    await new Promise((r) => setTimeout(r, 0));
    await fireEvent.click(container.querySelector('button.speaker'));
    await new Promise((r) => setTimeout(r, 0));
    expect(container.querySelector('.voice-note').textContent).toMatch(/no voice/i);
    expect(onspoke).toHaveBeenCalledWith('rosa', null);
    expect(container.querySelector('button.speaker').disabled).toBe(false);   // a retry stays possible
  });
  it('disables the speaker with a note when there is no voice', async () => {
    const reader = await readerWith('Rosa.');
    const voice = { tier: async () => null, speak: vi.fn() };
    const { container } = render(Dictionary, { block: reader.blocks[0], reader, onclose: () => {}, voice });
    await new Promise((r) => setTimeout(r, 0));
    const button = container.querySelector('button.speaker');
    expect(button.disabled).toBe(true);
    expect(button.title).toMatch(/no voice/i);
    expect(container.querySelector('.voice-note').textContent).toMatch(/no voice/i);
  });
});

describe('Dictionary names its sources per language', () => {
  it('calls the English source Whitaker for Latin', async () => {
    const reader = await readerWith('Rosa.');
    const { container } = render(Dictionary, { block: reader.blocks[0], reader, onclose: () => {} });
    expect(container.querySelector('button.dict-tab').textContent).toMatch(/Whitaker/);
  });
});
