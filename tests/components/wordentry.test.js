// @vitest-environment jsdom
import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/svelte';
import { tick } from 'svelte';
import WordEntry from '../../src/app/components/WordEntry.svelte';
import { getLanguage } from '../../src/lang/registry.js';

const flush = () => new Promise((r) => setTimeout(r, 0));

describe('a word’s dictionary entry, shared by the pronunciation trainer and Learn (Allan, 2026-10-20)', () => {
  it('shows the lemma, its gloss and its readings; a word the dictionary lacks links to Wiktionary', async () => {
    const info = async () => ({ lemmas: { 7: { headword: '달', pos: 'noun' } }, ipa: {}, glosses: { 7: 'moon' } });
    const lookup = async (w) => (w === '달이' ? [{ lemma: 7, pos: 'noun', case: 'nom' }] : []);
    const { container } = render(WordEntry, { word: '달이', lang: getLanguage('ko'), lookup, loadInfo: info });
    await flush(); await flush();
    expect(container.querySelector('.entry .form b').textContent).toBe('달');
    expect(container.querySelector('.entry .gloss').textContent).toBe('moon');
    const none = render(WordEntry, { word: '없다', lang: getLanguage('ko'), lookup, loadInfo: info });
    await flush(); await flush();
    expect(none.container.querySelector('a[href*="wiktionary"]')).not.toBe(null);
  });
});

// Allan, 2026-10-28: in German Learn a click found nothing — the word was lowercased before the lookup (Mutter → mutter)
describe('WordEntry keeps the case a language needs', () => {
  it('looks a German noun up as written, lowercase only as a fallback; the note names no Latin dictionary', async () => {
    const seen = [];
    const lookup = async (w) => { seen.push(w); return w === 'Mutter' ? [{ lemma: 1, pos: 'noun' }] : w === 'gehen' ? [{ lemma: 2, pos: 'verb' }] : []; };
    const loadInfo = async () => ({ lemmas: { 1: { headword: 'Mutter', pos: 'noun' }, 2: { headword: 'gehen', pos: 'verb' } }, ipa: {}, glosses: {} });
    const a = render(WordEntry, { word: 'Mutter', lang: getLanguage('de'), lookup, loadInfo });
    await new Promise((r) => setTimeout(r, 30)); await tick();
    expect(seen[0]).toBe('Mutter');
    expect(a.container.textContent).not.toMatch(/not in the dictionary/);
    const b = render(WordEntry, { word: 'Gehen', lang: getLanguage('de'), lookup, loadInfo });
    await new Promise((r) => setTimeout(r, 30)); await tick();
    expect(seen).toContain('gehen');
    const c = render(WordEntry, { word: 'Xyzzy', lang: getLanguage('de'), lookup, loadInfo });
    await new Promise((r) => setTimeout(r, 30)); await tick();
    expect(c.container.textContent).not.toMatch(/Whitaker/);
  });
});
