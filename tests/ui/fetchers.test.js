import { describe, it, expect, vi } from 'vitest';
import { makeFetchShard, loadManifest, loadGlosses } from '../../src/app/lib/fetchers.js';

function fakeFetch(files) {
  return vi.fn(async (url) => {
    if (!(url in files)) return { ok: false, status: 404, json: async () => { throw new Error('404'); } };
    return { ok: true, status: 200, json: async () => structuredClone(files[url]) };
  });
}

describe('fetchers', () => {
  it('fetches a shard by name under the base', async () => {
    const f = fakeFetch({ '/data/forms/ro.json': { rosa: [[1, 'nnsf']] } });
    const data = await makeFetchShard(f)('ro');
    expect(data.rosa).toEqual([[1, 'nnsf']]);
    expect(f).toHaveBeenCalledWith('/data/forms/ro.json');
  });

  it('rejects on a missing shard so the lexicon can degrade that word', async () => {
    const f = fakeFetch({});
    await expect(makeFetchShard(f)('zz')).rejects.toThrow();
  });

  it('loads the manifest', async () => {
    const f = fakeFetch({ '/data/manifest.json': { format: 2, shards: { ro: {} } } });
    expect((await loadManifest(f)).format).toBe(2);
  });

  it('returns null for an absent gloss language instead of throwing', async () => {
    const f = fakeFetch({ '/data/glosses.en.json': { 1: 'rose' } });
    expect(await loadGlosses(f, '/data', 'pt')).toBe(null);
    expect((await loadGlosses(f, '/data', 'en'))[1]).toBe('rose');
  });
});
