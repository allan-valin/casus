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

describe('pronunciation variants can be chosen (Allan, 2026-10-28)', () => {
  it('starts on the standard phonetic form; a click swaps the expected IPA and its sounds', async () => {
    const files = { '/v/lemmas.json': { 3: { headword: 'er' } }, '/v/ipa.json': { 3: [{ ipa: '/eːr/', tags: ['standard'] }, { ipa: '[ʔeːɐ̯]', tags: ['standard'] }, { ipa: '[ʔɛɐ̯]', tags: ['standard'] }, { ipa: '/ɐ/', tags: ['colloquial'] }] } };
    const f = async (url) => (files[url] ? { ok: true, json: async () => files[url] } : { ok: false, json: async () => ({}) });
    const { container } = render(Trainer, { lang: getLanguage('de'), fetchImpl: f, data: '/v', text: 'er', compact: true });
    await flush();
    expect(container.querySelector('.word .ipa').textContent).toContain('[ʔeːɐ̯]');
    const third = [...container.querySelectorAll('button.variant')].find((b) => b.textContent.includes('[ʔɛɐ̯]'));
    third.click(); await flush();
    expect(container.querySelector('.word .ipa').textContent).toContain('[ʔɛɐ̯]');
    expect([...container.querySelectorAll('.sounds .snd')].map((b) => b.textContent)).toEqual(['ʔ', 'ɛ', 'ɐ̯']);
  });
});
