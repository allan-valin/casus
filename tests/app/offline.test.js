import { describe, it, expect } from 'vitest';
import { filesOf, downloadLanguage, removeLanguage, downloadedSize, liveEntries, clearLive } from '../../src/app/lib/offline.js';

const manifest = { shards: { ab: 1, 'αβ': 1 }, paradigms: { buckets: 2 }, files: ['wordfreq.json'], total_bytes: 1000 };

function fakeCaches() {
  const stores = new Map();
  return {
    stores,
    open: async (name) => { if (!stores.has(name)) stores.set(name, new Map()); const m = stores.get(name); return { put: async (url, res) => m.set(url, res), keys: async () => [...m.keys()].map((url) => ({ url })), match: async (url) => m.get(url) }; },
    delete: async (name) => stores.delete(name),
    has: async (name) => stores.has(name),
  };
}

describe('offline dictionaries (Allan, 2026-10-19: a download manager)', () => {
  it('a language’s files: manifest, every shard, the side files, the paradigm buckets', () => {
    const f = filesOf(manifest);
    expect(f).toContain('manifest.json');
    expect(f).toContain('forms/ab.json');
    expect(f).toContain(`forms/${encodeURIComponent('αβ')}.json`);
    expect(f).toContain('paradigms/1.json');
    expect(f).toContain('wordfreq.json');
    expect(f).toContain('lemmas.json');
  });
  it('downloads into its own cache, reports progress, skips files the language does not ship; removes', async () => {
    const caches = fakeCaches();
    const fetchImpl = async (url) => (url.endsWith('/manifest.json') ? { ok: true, json: async () => manifest, clone() { return this; } }
      : url.includes('glosses.pt') ? { ok: false, status: 404 } : { ok: true, clone() { return this; }, headers: { get: () => '10' } });
    const seen = [];
    const n = await downloadLanguage({ code: 'cs', base: '/casus/cs-data', fetchImpl, caches, onProgress: (done, total) => seen.push([done, total]) });
    expect(n).toBeGreaterThan(5);
    expect([...caches.stores.get('casus-data-cs').keys()].some((u) => u.endsWith('glosses.pt.json'))).toBe(false);
    expect(seen.at(-1)[0]).toBe(seen.at(-1)[1]);
    expect(await downloadedSize({ code: 'cs', caches })).toBeGreaterThan(0);
    await removeLanguage({ code: 'cs', caches });
    expect(caches.stores.has('casus-data-cs')).toBe(false);
  });
  it('counts and clears the live Wiktionary answers kept for a language', () => {
    const data = { 'casus.live.cs.praze': '{}', 'casus.live.cs.byl': '{}', 'casus.live.pl.x': '{}', other: '1' };
    const storage = { get length() { return Object.keys(data).length; }, key: (i) => Object.keys(data)[i], removeItem: (k) => delete data[k] };
    expect(liveEntries(storage, 'cs')).toBe(2);
    clearLive(storage, 'cs');
    expect(Object.keys(data)).toEqual(['casus.live.pl.x', 'other']);
  });
});
