// @vitest-environment jsdom
import { describe, it, expect } from 'vitest';
import { render, fireEvent } from '@testing-library/svelte';
import { tick } from 'svelte';
import Downloads from '../../src/app/components/Downloads.svelte';

function fakeCaches() {
  const stores = new Map();
  return { stores, open: async (n) => { if (!stores.has(n)) stores.set(n, new Map()); const m = stores.get(n); return { put: async (u, r) => m.set(u, r), keys: async () => [...m.keys()].map((url) => ({ url })), match: async (u) => m.get(u) }; },
    delete: async (n) => stores.delete(n), has: async (n) => stores.has(n) };
}
const manifest = { shards: { a: 1 }, total_bytes: 2_000_000 };
const fetchImpl = async (url) => (url.endsWith('manifest.json') ? { ok: true, json: async () => manifest } : { ok: true });
const flush = async () => { for (let i = 0; i < 6; i += 1) { await tick(); await new Promise((r) => setTimeout(r, 0)); } };

describe('Downloads panel', () => {
  it('lists every language with its size; downloads one for offline and removes it again', async () => {
    const caches = fakeCaches();
    const said = [];
    const { container } = render(Downloads, { fetchImpl, caches, storage: null, current: 'cs', onsay: (k) => said.push(k) });
    await flush();
    const rows = container.querySelectorAll('.dl-row');
    expect(rows.length).toBe(16);                       // Casus's own languages (the sites split 2026-10-19; Ukrainian joined 2026-10-20, Lithuanian and Serbo-Croatian 2026-10-21)
    const cs = container.querySelector('.dl-row[data-code="cs"]');
    expect(cs.textContent).toMatch(/2(\.0)? MB/);
    await fireEvent.click(cs.querySelector('button.dl-get'));
    await flush();
    expect(caches.stores.has('casus-data-cs')).toBe(true);
    expect(container.querySelector('.dl-row[data-code="cs"] .dl-state').textContent).toMatch(/offline|baixado|saved/i);
    await fireEvent.click(container.querySelector('.dl-row[data-code="cs"] button.dl-remove'));
    await flush();
    expect(caches.stores.has('casus-data-cs')).toBe(false);
    expect(said).toContain('act.dl.done');
  });
});
