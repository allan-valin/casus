import { describe, it, expect, vi } from 'vitest';
import { createLexicon, decodeAnalysis, shardKey } from '../src/lib/lexicon.js';

const SHARDS = {
  ro: { rosam: [{ lemma: 'ros:noun:1', pos: 'noun', case: 'acc', number: 'sg', gender: 'f' }] },
  ur: { urbem: [{ lemma: 'urb:noun:1', pos: 'noun', case: 'acc', number: 'sg', gender: 'f' }] },
};

function makeFetch(shards = SHARDS) {
  return vi.fn(async (name) => structuredClone(shards[name] ?? {}));
}

describe('createLexicon', () => {
  it('looks a form up from its shard', async () => {
    const lex = createLexicon({ fetchShard: makeFetch() });
    expect((await lex.lookup('rosam'))[0].case).toBe('acc');
  });

  it('returns an empty array for an unknown form', async () => {
    const lex = createLexicon({ fetchShard: makeFetch() });
    expect(await lex.lookup('xyzzy')).toEqual([]);
  });

  it('fetches each shard at most once', async () => {
    const fetchShard = makeFetch();
    const lex = createLexicon({ fetchShard });
    await lex.lookup('rosam');
    await lex.lookup('rosam');
    expect(fetchShard).toHaveBeenCalledTimes(1);
    expect(lex.loadedShards()).toEqual(['ro']);
  });

  it('shares one fetch between concurrent lookups of the same shard', async () => {
    const fetchShard = makeFetch();
    const lex = createLexicon({ fetchShard });
    await Promise.all([lex.lookup('rosam'), lex.lookup('rosa')]);
    expect(fetchShard).toHaveBeenCalledTimes(1);
  });

  it('deduplicates shards across a batch lookup', async () => {
    const fetchShard = makeFetch();
    const lex = createLexicon({ fetchShard });
    const found = await lex.lookupAll(['rosam', 'urbem', 'rosam']);
    expect(found.get('urbem')).toHaveLength(1);
    expect(found.get('rosam')).toHaveLength(1);
    expect(fetchShard).toHaveBeenCalledTimes(2);
  });

  it('survives a failed shard fetch without throwing', async () => {
    const lex = createLexicon({ fetchShard: async () => { throw new Error('offline'); } });
    expect(await lex.lookup('rosam')).toEqual([]);
  });

  it('decodes format-2 rows into spelled-out analyses', async () => {
    const shards = { ro: { rosa: [[33776, 'pnsfrp3'], [33803, 'nnsf', 'nbsf']] } };
    const lex = createLexicon({ fetchShard: makeFetch(shards), manifest: { format: 2, shards: { ro: {} } } });
    const analyses = await lex.lookup('rosa');
    expect(analyses).toEqual([
      { lemma: '33776', pos: 'vpar', case: 'nom', number: 'sg', gender: 'f', tense: 'perf', voice: 'pass', conj: '3' },
      { lemma: '33803', pos: 'noun', case: 'nom', number: 'sg', gender: 'f' },
      { lemma: '33803', pos: 'noun', case: 'abl', number: 'sg', gender: 'f' },
    ]);
  });

  it('picks the longest shard name that prefixes the form when a manifest is given', async () => {
    const fetchShard = makeFetch({ cons: { consul: [[1, 'nnsm']] }, co: { cor: [[2, 'nnsn']] } });
    const manifest = { format: 2, shards: { co: {}, con: {}, cons: {} } };
    const lex = createLexicon({ fetchShard, manifest });
    expect((await lex.lookup('consul'))[0].lemma).toBe('1');
    expect((await lex.lookup('cor'))[0].lemma).toBe('2');
    expect(fetchShard.mock.calls.map((c) => c[0])).toEqual(['cons', 'co']);
  });

  it('does not fetch at all for a form no shard name prefixes', async () => {
    const fetchShard = makeFetch();
    const lex = createLexicon({ fetchShard, manifest: { format: 2, shards: { ro: {} } } });
    expect(await lex.lookup('zebra')).toEqual([]);
    expect(fetchShard).not.toHaveBeenCalled();
  });
});

describe('shardKey', () => {
  it('mirrors tools/casus_build/shard.py', () => {
    expect(shardKey('rosam')).toBe('ro');
    expect(shardKey('a')).toBe('a');
    const names = new Set(['a', 'ro', 'co', 'coa', 'con', 'cons']);
    expect(shardKey('coactus', names)).toBe('coa');
    expect(shardKey('consul', names)).toBe('cons');
    expect(shardKey('cor', names)).toBe('co');
    expect(shardKey('zebra', names)).toBe(null);
  });
});

describe('decodeAnalysis', () => {
  it('round-trips every part of speech the build emits', () => {
    expect(decodeAnalysis('ansmp', '7')).toEqual({ lemma: '7', pos: 'adj', case: 'nom', number: 'sg', gender: 'm', degree: 'pos' });
    expect(decodeAnalysis('v3plspi', '9')).toEqual({ lemma: '9', pos: 'verb', person: '3', number: 'pl', tense: 'plup', mood: 'sub', voice: 'pass', conj: '3-io' });
    expect(decodeAnalysis('rb', '1')).toEqual({ lemma: '1', pos: 'prep', governs: 'abl' });
    expect(decodeAnalysis('c', '3')).toEqual({ lemma: '3', pos: 'conj' });
    expect(decodeAnalysis('uasn', '5')).toEqual({ lemma: '5', pos: 'supine', case: 'acc', number: 'sg', gender: 'n' });
  });
});
