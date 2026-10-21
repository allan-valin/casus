/*
 * A Piper voice fed with our own sounds instead of its language's (Allan, 2026-10-21: Macedonian has no voice of its
 * own; the Bulgarian Piper voice reading Macedonian sounds is human-like, espeak is robotic). Same interface as the
 * piper-tts-web library (download, predict → WAV Blob, remove, stored), so createVoice treats it like any natural
 * voice. The model comes from rhasspy/piper-voices (the library does not list it) and is kept in the browser's cache;
 * onnxruntime-web (MIT) runs it.
 */
import { phonemeIds as mkIds } from '../../lang/mk/phonemes.js';

const HF = 'https://huggingface.co/rhasspy/piper-voices/resolve/main';
const PATHS = { 'bg_BG-dimitar-medium': 'bg/bg_BG/dimitar/medium/bg_BG-dimitar-medium.onnx' };
import { ENGINE } from './voice.js';   // the same onnxruntime, on our own site, as the other natural voices
const PHONEMES = { mk: mkIds };

export async function loadOrtEngine() {
  const ort = await import('onnxruntime-web/wasm');
  const o = ort.default ?? ort;
  if (o.env?.wasm) {
    o.env.wasm.wasmPaths = ENGINE;
    // the voice is computed in a worker, so the page stays responsive meanwhile (Allan, 2026-10-21: buttons lagged)
    o.env.wasm.proxy = true;
    if (!globalThis.crossOriginIsolated) o.env.wasm.numThreads = 1;   // threads need cross-origin isolation, which Pages lacks
  }
  return o;
}

function wav(pcm, rate) {
  const buf = new ArrayBuffer(44 + pcm.length * 2);
  const v = new DataView(buf);
  const str = (o, s) => [...s].forEach((c, i) => v.setUint8(o + i, c.charCodeAt(0)));
  str(0, 'RIFF'); v.setUint32(4, 36 + pcm.length * 2, true); str(8, 'WAVEfmt '); v.setUint32(16, 16, true); v.setUint16(20, 1, true);
  v.setUint16(22, 1, true); v.setUint32(24, rate, true); v.setUint32(28, rate * 2, true); v.setUint16(32, 2, true); v.setUint16(34, 16, true);
  str(36, 'data'); v.setUint32(40, pcm.length * 2, true);
  pcm.forEach((x, i) => v.setInt16(44 + i * 2, Math.round(Math.max(-1, Math.min(1, x)) * 32767), true));
  return new Blob([buf], { type: 'audio/wav' });
}

export function createPhonemePiper({ phonemes, fetchImpl = (...a) => fetch(...a), openCache = () => caches.open('casus-voices'), loadOrt = loadOrtEngine } = {}) {
  const toIds = PHONEMES[phonemes];
  if (!toIds) throw new Error(`no sound rules for ${phonemes}`);
  const urls = (voiceId) => { const p = PATHS[voiceId]; if (!p) throw new Error(`unknown voice ${voiceId}`); return [`${HF}/${p}.json`, `${HF}/${p}`]; };
  const sessions = new Map();

  async function get(url, progress) {
    const cache = await openCache();
    const hit = await cache.match(url);
    if (hit) return hit;
    const res = await fetchImpl(url);
    if (!res.ok) throw new Error(`${url}: ${res.status}`);
    const body = await res.arrayBuffer();
    progress?.({ loaded: body.byteLength, total: body.byteLength });
    await cache.put(url, new Response(body));
    return cache.match(url);
  }
  async function session(voiceId) {
    if (!sessions.has(voiceId)) {
      sessions.set(voiceId, (async () => {
        const [cfgUrl, modelUrl] = urls(voiceId);
        const cfg = await (await get(cfgUrl)).json();
        const ort = await loadOrt();
        const s = await ort.InferenceSession.create(await (await get(modelUrl)).arrayBuffer(), { executionProviders: ['wasm'] });
        return { cfg, ort, s };
      })().catch((e) => { sessions.delete(voiceId); throw e; }));
    }
    return sessions.get(voiceId);
  }
  return {
    async download(voiceId, progress) { for (const u of urls(voiceId)) await get(u, progress); },
    async stored() {
      const cache = await openCache();
      const have = new Set((await cache.keys()).map((r) => r.url));
      return Object.keys(PATHS).filter((id) => urls(id).every((u) => have.has(u)));
    },
    async remove(voiceId) {
      const cache = await openCache();
      for (const u of urls(voiceId)) await cache.delete(u);
      sessions.delete(voiceId);
    },
    async predict({ text, voiceId, lengthScale = 1 }) {   // lengthScale > 1: slower (multiplies the model's own)
      const { cfg, ort, s } = await session(voiceId);
      const ids = toIds(text, cfg.phoneme_id_map);
      const big = BigInt64Array.from(ids.map(BigInt));
      const { noise_scale: ns, length_scale: ls, noise_w: nw } = cfg.inference;
      const out = await s.run({ input: new ort.Tensor('int64', big, [1, big.length]), input_lengths: new ort.Tensor('int64', BigInt64Array.from([BigInt(big.length)]), [1]),
        scales: new ort.Tensor('float32', Float32Array.from([ns, ls * lengthScale, nw]), [3]) });
      return wav(out[s.outputNames[0]].data, cfg.audio.sample_rate);
    },
  };
}
