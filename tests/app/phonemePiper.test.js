import { describe, it, expect } from 'vitest';
import { createPhonemePiper } from '../../src/app/lib/phonemePiper.js';

/* The Bulgarian Piper voice reading Macedonian sounds in the browser (Allan, 2026-10-21). */
const CFG = { audio: { sample_rate: 22050 }, inference: { noise_scale: 0.667, length_scale: 1, noise_w: 0.8 }, phoneme_id_map: { '^': [1], _: [0], $: [2], d: [17], a: [14], ˈ: [120] } };
function fakes() {
  const fetched = [];
  const store = new Map();
  const cache = { match: async (u) => store.get(u), put: async (u, r) => { store.set(u, r); }, delete: async (u) => store.delete(u), keys: async () => [...store.keys()].map((url) => ({ url })) };
  const fetchImpl = async (u) => { fetched.push(u); return new Response(u.endsWith('.json') ? JSON.stringify(CFG) : new Uint8Array([1, 2, 3])); };
  const runs = [];
  const ort = { Tensor: class { constructor(type, data, dims) { Object.assign(this, { type, data, dims }); } },
    InferenceSession: { create: async () => ({ outputNames: ['output'], run: async (feeds) => { runs.push(feeds); return { output: { data: new Float32Array([0, 0.5, -0.5]) } }; } }) } };
  return { fetched, store, cache, fetchImpl, runs, loadOrt: async () => ort };
}

describe('phoneme Piper', () => {
  it('downloads the model once into the cache, then predicts from our Macedonian sounds', async () => {
    const f = fakes();
    const p = createPhonemePiper({ phonemes: 'mk', fetchImpl: f.fetchImpl, openCache: async () => f.cache, loadOrt: f.loadOrt });
    await p.download('bg_BG-dimitar-medium');
    expect(f.fetched.filter((u) => u.endsWith('.onnx'))).toHaveLength(1);
    expect(await p.stored()).toEqual(['bg_BG-dimitar-medium']);
    const wav = await p.predict({ text: 'да', voiceId: 'bg_BG-dimitar-medium' });
    expect([...f.runs[0].input.data].map(Number)).toEqual([1, 0, 17, 0, 120, 0, 14, 0, 2]);
    expect(wav.type).toBe('audio/wav');
    expect(wav.size).toBe(44 + 3 * 2);
    expect(f.fetched.filter((u) => u.endsWith('.onnx'))).toHaveLength(1);   // predicted from the cache
  });
  it('remove forgets the model', async () => {
    const f = fakes();
    const p = createPhonemePiper({ phonemes: 'mk', fetchImpl: f.fetchImpl, openCache: async () => f.cache, loadOrt: f.loadOrt });
    await p.download('bg_BG-dimitar-medium');
    await p.remove('bg_BG-dimitar-medium');
    expect(await p.stored()).toEqual([]);
  });
});
