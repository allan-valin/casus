// @vitest-environment jsdom
import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/svelte';
import { tick } from 'svelte';
import Trainer from '../../src/app/components/Trainer.svelte';
import { getLanguage } from '../../src/lang/registry.js';

const flush = async () => { for (let i = 0; i < 20; i += 1) { await tick(); await new Promise((r) => setTimeout(r, 0)); } };
const FILES = {
  '/d/lemmas.json': { l1: { headword: 'добро' } },
  '/d/ipa.json': { l1: [{ ipa: '/ˈdɔbrɔ/' }] },
};
const fetchImpl = async (url) => (FILES[url] ? { ok: true, json: async () => FILES[url] } : { ok: false, json: async () => ({}) });

describe('Pronunciation trainer says what it cannot score (Allan, 2026-10-27)', () => {
  it('counts the words without a transcription of their own', async () => {
    const { container } = render(Trainer, { lang: getLanguage('mk'), fetchImpl, data: '/d', text: 'добро разбрав', compact: true });
    await flush();
    expect(container.querySelector('.partial')?.textContent).toMatch(/1 of 2 words/);
  });
  it('no note when every word has its own transcription', async () => {
    const { container } = render(Trainer, { lang: getLanguage('mk'), fetchImpl, data: '/d', text: 'добро', compact: true });
    await flush();
    expect(container.querySelector('.words')).not.toBeNull();
    expect(container.querySelector('.partial')).toBeNull();
  });
});
