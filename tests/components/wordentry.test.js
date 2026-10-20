// @vitest-environment jsdom
import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/svelte';
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
