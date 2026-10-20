// @vitest-environment jsdom
import { describe, it, expect } from 'vitest';
import { render, fireEvent } from '@testing-library/svelte';
import { tick } from 'svelte';
import SpotDrill from '../../src/app/components/SpotDrill.svelte';
import MatchDrill from '../../src/app/components/MatchDrill.svelte';
import PairsDrill from '../../src/app/components/PairsDrill.svelte';
import ShadowDrill from '../../src/app/components/ShadowDrill.svelte';
import { getLanguage } from '../../src/lang/registry.js';

const la = getLanguage('la');

describe('SpotDrill (spot the error)', () => {
  const items = [{ words: [{ text: 'Rosae', bad: false }, { text: 'puellae', bad: true }, { text: 'sunt.', bad: false }], wrong: 'puellae', right: 'puellarum', meaning: 'They are the girls’ roses.' }];
  it('tapping the wrong word counts as right and shows the fix', async () => {
    const results = [];
    const { container } = render(SpotDrill, { items, lang: la, random: () => 0, onresult: (q, ok) => results.push(ok) });
    const bad = [...container.querySelectorAll('button.spot-word')].find((b) => b.textContent === 'puellae');
    await fireEvent.click(bad);
    expect(results).toEqual([true]);
    expect(container.textContent).toContain('puellarum');
  });
  it('tapping another word counts as wrong, and still shows the fix', async () => {
    const results = [];
    const { container } = render(SpotDrill, { items, lang: la, random: () => 0, onresult: (q, ok) => results.push(ok) });
    await fireEvent.click(container.querySelector('button.spot-word'));
    expect(results).toEqual([false]);
    expect(container.textContent).toContain('puellarum');
  });
});

describe('MatchDrill (matching grid)', () => {
  it('a word then its meaning makes a pair; when all are paired the round is done', async () => {
    const items = [{ w: 'rosa', en: 'rose' }, { w: 'puer', en: 'boy' }];
    const { container } = render(MatchDrill, { items, size: 2, random: () => 0 });
    const left = (w) => [...container.querySelectorAll('button.match-left')].find((b) => b.textContent === w);
    const right = (m) => [...container.querySelectorAll('button.match-right')].find((b) => b.textContent === m);
    await fireEvent.click(left('rosa')); await fireEvent.click(right('boy'));
    expect(left('rosa').disabled).toBe(false);          // wrong pair: nothing locked
    await fireEvent.click(left('rosa')); await fireEvent.click(right('rose'));
    expect(left('rosa').disabled).toBe(true);
    await fireEvent.click(left('puer')); await fireEvent.click(right('boy'));
    await tick();
    expect(container.querySelector('.match-done')).not.toBe(null);
  });
});

describe('PairsDrill (minimal pairs)', () => {
  it('speaks one word of the pair; choosing it is right', async () => {
    const spoken = [];
    const results = [];
    const voice = { speak: async (t) => { spoken.push(t); } };
    const items = [{ options: [{ w: 'Staat', ipa: '/ʃtaːt/' }, { w: 'Stadt', ipa: '/ʃtat/' }], say: { w: 'Stadt', ipa: '/ʃtat/' } }];
    const { container } = render(PairsDrill, { items, voice, random: () => 0, onresult: (q, ok) => results.push(ok) });
    await fireEvent.click(container.querySelector('button.pairs-play'));
    expect(spoken).toEqual(['Stadt']);
    await fireEvent.click([...container.querySelectorAll('button.pairs-option')].find((b) => b.textContent.includes('Stadt')));
    expect(results).toEqual([true]);
  });
});

describe('ShadowDrill (shadowing)', () => {
  it('shows a sentence and speaks it; without a microphone it says so', async () => {
    const spoken = [];
    const voice = { speak: async (t) => { spoken.push(t); } };
    const { container } = render(ShadowDrill, { sentences: [{ text: 'Rosa pulchra est.', en: 'The rose is beautiful.' }], voice, lang: la, random: () => 0 });
    expect(container.textContent).toContain('Rosa pulchra est.');
    await fireEvent.click(container.querySelector('button.shadow-play'));
    expect(spoken).toEqual(['Rosa pulchra est.']);
    expect(container.querySelector('button.shadow-record').disabled).toBe(true);   // jsdom has no MediaRecorder
  });
});
