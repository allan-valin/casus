// @vitest-environment jsdom
import { describe, it, expect } from 'vitest';
import { render, fireEvent } from '@testing-library/svelte';
import { tick } from 'svelte';
import PassagePicker from '../../src/app/components/PassagePicker.svelte';

const store = () => { const m = new Map(); return { getItem: (k) => m.get(k) ?? null, setItem: (k, v) => m.set(k, String(v)), m }; };
const flush = async () => { for (let i = 0; i < 4; i += 1) { await tick(); await new Promise((r) => setTimeout(r, 0)); } };

describe('the input is remembered (Allan, 2026-10-19)', () => {
  it('typed text comes back next time, per language', async () => {
    const storage = store();
    const a = render(PassagePicker, { onchoose: () => {}, fetchImpl: async () => ({ ok: false }), storage, code: 'cs', schedule: (fn) => fn() });
    await fireEvent.input(a.container.querySelector('textarea'), { target: { value: 'Byl pozdní večer.' } });
    await flush();
    a.unmount();
    const b = render(PassagePicker, { onchoose: () => {}, fetchImpl: async () => ({ ok: false }), storage, code: 'cs' });
    await flush();
    expect(b.container.querySelector('textarea').value).toBe('Byl pozdní večer.');
    const other = render(PassagePicker, { onchoose: () => {}, fetchImpl: async () => ({ ok: false }), storage, code: 'pl' });
    await flush();
    expect(other.container.querySelector('textarea').value).toBe('');
  });
  it('text sent with #append= is added at the bottom, and the address is cleaned', async () => {
    const storage = store();
    storage.setItem('casus:input:ja', '今日は晴れです。');
    let replaced = null;
    const said = [];
    const { container } = render(PassagePicker, { onchoose: () => {}, fetchImpl: async () => ({ ok: false }), storage, code: 'ja',
      location: { hash: `#append=${encodeURIComponent('猫が好きです。')}&from=${encodeURIComponent('www3.nhk.or.jp')}` }, replaceHash: () => { replaced = ''; }, onsay: (k, v) => said.push([k, v]) });
    await flush();
    expect(container.querySelector('textarea').value).toBe('今日は晴れです。\n\n猫が好きです。');
    expect(replaced).toBe('');
    expect(said[0]).toEqual(['act.appended', { site: 'www3.nhk.or.jp', chars: 7 }]);
  });
});
