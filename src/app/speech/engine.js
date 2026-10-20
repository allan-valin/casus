// The phone recogniser of the pronunciation trainer, after speech-to-ipa's engine (github.com/allan-valin/speech-to-ipa,
// web/app/engine.js): models download once into the browser cache (shared with speech-to-ipa on the same site) and run
// with onnxruntime-web, loaded from jsDelivr the first time. Only openly licensed models are offered.
import { computeLogmel } from './fbank.js';
import { greedyCtc } from './ctc.js';

const HF = 'https://huggingface.co';
const ORT_URL = 'https://cdn.jsdelivr.net/npm/onnxruntime-web@1.30.0/dist/ort.all.min.js';
const CACHE = 'ipa-models-v1';

export const MODELS = [
  { id: 'powsm', name: 'POWSM', mb: 214, input: 'logmel', license: 'CC BY 4.0', credit: 'Li et al. 2025',
    url: `${HF}/allan-valin/powsm-ctc-onnx/resolve/main/model.int8.onnx`,
    vocab: `${HF}/allan-valin/powsm-ctc-onnx/resolve/main/vocab.json`, source: `${HF}/espnet/powsm` },
  { id: 'wav2vec2phoneme', name: 'Wav2Vec2Phoneme', mb: 357, input: 'wave', license: 'Apache 2.0', credit: 'Xu et al. 2021',
    url: `${HF}/allan-valin/wav2vec2phoneme-onnx/resolve/main/model.int8.onnx`,
    vocab: `${HF}/allan-valin/wav2vec2phoneme-onnx/resolve/main/vocab.json`, source: `${HF}/facebook/wav2vec2-xlsr-53-espeak-cv-ft` },
  { id: 'multipa', name: 'MultIPA', mb: 318, input: 'wave', license: 'MIT', credit: 'Taguchi et al. 2023',
    url: `${HF}/allan-valin/multipa-onnx/resolve/main/model.int8.onnx`,
    vocab: `${HF}/allan-valin/multipa-onnx/resolve/main/vocab.json`, source: `${HF}/ctaguchi/wav2vec2-large-xlsr-japlmthufielta-ipa1000-ns` },
];

let ortPromise = null;
function loadOrt() {
  if (globalThis.ort) return Promise.resolve(globalThis.ort);
  ortPromise ??= new Promise((resolve, reject) => {
    const s = document.createElement('script');
    s.src = ORT_URL; s.crossOrigin = 'anonymous';
    s.onload = () => resolve(globalThis.ort);
    s.onerror = () => { ortPromise = null; reject(new Error('onnxruntime-web did not load')); };
    document.head.appendChild(s);
  });
  return ortPromise;
}

async function cached(url) {
  try { return await (await caches.open(CACHE)).match(url); } catch { return null; }
}

export async function isCached(model) {
  return !!(await cached(model.url));
}

async function fetchBytes(url, onProgress) {
  const hit = await cached(url);
  if (hit) { onProgress?.(1, true); return new Uint8Array(await hit.arrayBuffer()); }
  const res = await fetch(url);
  if (!res.ok) throw new Error(`download failed (${res.status})`);
  const total = +res.headers.get('content-length') || 0, reader = res.body.getReader(), parts = [];
  let got = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    parts.push(value); got += value.length;
    if (total) onProgress?.(got / total, false);
  }
  const bytes = new Uint8Array(got);
  let off = 0;
  for (const p of parts) { bytes.set(p, off); off += p.length; }
  try { await navigator.storage?.persist?.(); await (await caches.open(CACHE)).put(url, new Response(bytes)); } catch { /* not kept */ }
  return bytes;
}

let logmelCfg = null;

/** download (or read from the cache) and open a model; `base` is the site base, where ipa-engine/ lives */
export async function load(model, onProgress, base = '/') {
  const ort = await loadOrt();
  if (model.input === 'logmel' && !logmelCfg) logmelCfg = await (await fetch(`${base}ipa-engine/powsm_frontend.json`)).json();
  const [bytes, vocab] = await Promise.all([fetchBytes(model.url, onProgress), fetch(model.vocab).then((r) => r.json())]);
  const session = await ort.InferenceSession.create(bytes, { executionProviders: ['wasm'] });
  const table = vocab.vocab || vocab;
  const id2sym = [];
  for (const [sym, id] of Object.entries(table)) id2sym[id] = sym;
  return { session, id2sym, blank: vocab.blank ?? 0 };
}

/** transcribe 16 kHz mono audio: [{ sym, start, end }] with times in seconds */
export async function transcribe(model, loaded, wav) {
  const ort = globalThis.ort;
  let feeds;
  if (model.input === 'logmel') {
    const { data, frames } = computeLogmel(wav, logmelCfg);
    feeds = { feats: new ort.Tensor('float32', data, [1, frames, 80]), feats_lens: new ort.Tensor('int64', BigInt64Array.from([BigInt(frames)]), [1]) };
  } else {
    feeds = { wav: new ort.Tensor('float32', wav, [1, wav.length]) };
  }
  const out = (await loaded.session.run(feeds)).logits;
  const [, frames, vocabSize] = out.dims;
  const secPerFrame = wav.length / 16000 / frames;
  return greedyCtc(out.data, frames, vocabSize, loaded.id2sym, loaded.blank)
    .map((p) => ({ sym: p.sym, start: p.start * secPerFrame, end: p.end * secPerFrame }));
}

/** decode a recording at 16 kHz mono (one resampling; speech-to-ipa's to16kMono) */
export async function to16kMono(buf) {
  const ctx = new AudioContext({ sampleRate: 16000 });
  const decoded = await ctx.decodeAudioData(buf);
  ctx.close();
  if (decoded.numberOfChannels === 1 && decoded.sampleRate === 16000) return decoded.getChannelData(0);
  const off = new OfflineAudioContext(1, Math.max(1, Math.ceil(decoded.duration * 16000)), 16000);
  const src = off.createBufferSource();
  src.buffer = decoded; src.connect(off.destination); src.start();
  return (await off.startRendering()).getChannelData(0);
}

/** play part of 16 kHz audio (seconds; whole when no times) */
export function playSamples(wav, start = 0, end = null) {
  const ctx = new AudioContext({ sampleRate: 16000 });
  const from = Math.max(0, Math.floor(start * 16000)), to = Math.min(wav.length, end == null ? wav.length : Math.ceil(end * 16000));
  const buf = ctx.createBuffer(1, Math.max(1, to - from), 16000);
  buf.copyToChannel(wav.subarray(from, to), 0);
  const src = ctx.createBufferSource();
  src.buffer = buf; src.connect(ctx.destination); src.start();
  src.onended = () => ctx.close();
}

/** 16-bit PCM WAV bytes of 16 kHz mono audio (speech-to-ipa's export.js) */
export function wavBytes(samples, rate = 16000) {
  const out = new Uint8Array(44 + samples.length * 2), v = new DataView(out.buffer);
  const str = (o, s) => [...s].forEach((c, i) => v.setUint8(o + i, c.charCodeAt(0)));
  str(0, 'RIFF'); v.setUint32(4, 36 + samples.length * 2, true); str(8, 'WAVE');
  str(12, 'fmt '); v.setUint32(16, 16, true); v.setUint16(20, 1, true); v.setUint16(22, 1, true);
  v.setUint32(24, rate, true); v.setUint32(28, rate * 2, true); v.setUint16(32, 2, true); v.setUint16(34, 16, true);
  str(36, 'data'); v.setUint32(40, samples.length * 2, true);
  samples.forEach((x, i) => v.setInt16(44 + i * 2, Math.max(-1, Math.min(1, x)) * 0x7fff, true));
  return out;
}
