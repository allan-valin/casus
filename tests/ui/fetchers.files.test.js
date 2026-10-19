import { describe, it, expect, vi } from 'vitest';
import { fileFetcherFor } from '../../src/app/lib/fetchers.js';

describe('a language ships extra files its manifest names (Chinese wordfreq.json); others are never requested', () => {
  it('names in manifest.files, or German expressions, are fetched; anything else resolves to null without a request', async () => {
    const fetchImpl = vi.fn(async () => ({ ok: true, json: async () => ({ a: 1 }) }));
    const zh = fileFetcherFor({ files: ['wordfreq.json'] }, fetchImpl, '/data/zh');
    expect(await zh('wordfreq.json')).toEqual({ a: 1 });
    expect(await zh('expressions.json')).toBe(null);
    const de = fileFetcherFor({ expressions: true }, fetchImpl, '/data/de');
    expect(await de('expressions.json')).toEqual({ a: 1 });
    expect(fetchImpl).toHaveBeenCalledTimes(2);
    expect(fileFetcherFor({}, fetchImpl, '/data/ja')).toBe(null);
  });
});
