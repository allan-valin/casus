/*
 * The speaker (languages design §6, §11.3). Tiers, best first:
 *   1. a natural voice the reader downloaded (Piper; a later phase),
 *   2. the browser's own voice for the language (speechSynthesis),
 *   3. espeak-ng compiled to WebAssembly, loaded from jsDelivr the first time it is needed
 *      (GPL-3.0, robotic, but it speaks Latin, Ancient Greek and Macedonian),
 *   4. none: the button is disabled and says so.
 * No modern-language voice stands in for an ancient one.
 */
import { createPhonemePiper } from './phonemePiper.js';

// One onnxruntime version for every natural voice (Allan, 2026-10-21: "no available backend found … .mjs"): the CDN
// bundle of the Piper library pulled the newest onnxruntime-web but pointed it at the 1.18.0 engine files, which have
// no .mjs — so the voice failed in Firefox and fell back to espeak. The library is loaded with onnxruntime pinned, and
// its engine files come from the same version; src/app/lib/phonemePiper.js uses it too.
export const ORT_VERSION = '1.27.0';
export const ORT_DIST = `https://cdn.jsdelivr.net/npm/onnxruntime-web@${ORT_VERSION}/dist/`;
const PIPER_URL = `https://esm.sh/@mintplex-labs/piper-tts-web@1.0.5?deps=onnxruntime-web@${ORT_VERSION}`;

/** Piper in the browser (MIT): download(voiceId, progress), predict({ text, voiceId }) -> WAV Blob, remove(voiceId). */
export async function loadPiperFromCdn(importer = (u) => import(/* @vite-ignore */ u)) {
  const mod = await importer(PIPER_URL);
  // the library's own predict() builds its session with its built-in 1.18.0 paths (its constructor starts loading
  // before it stores the paths it is given, and ignores WASM_LOCATIONS): sessions are created here with ours
  // It also keeps one global session and reuses it whatever paths or voice are asked next, so each voice gets its own
  // session here, created with the global cleared first.
  const wasmPaths = { onnxWasm: ORT_DIST, piperData: `${mod.WASM_BASE}.data`, piperWasm: `${mod.WASM_BASE}.wasm` };
  const sessions = new Map();
  const sessionFor = (voiceId) => {
    if (!sessions.has(voiceId)) {
      if (mod.TtsSession) mod.TtsSession._instance = null;
      sessions.set(voiceId, mod.TtsSession.create({ voiceId, wasmPaths }).catch((e) => { sessions.delete(voiceId); throw e; }));
    }
    return sessions.get(voiceId);
  };
  return { ...mod, predict: async ({ text, voiceId }) => (await sessionFor(voiceId)).predict(text) };
}

// what is playing now, so a sentence can be paused and resumed (Allan, 2026-10-21: "I need to be able to pause it")
let currentAudio = null;
export function pausePlayback() {
  currentAudio?.pause();
  if (context?.state === 'running') context.suspend();
}
// ends what is playing now (another step was started): the audio stops and its promise settles
export function stopPlayback() {
  if (currentAudio) { const a = currentAudio; currentAudio = null; a.pause(); a.onended?.(); }
  if (currentSource) { const src = currentSource; currentSource = null; try { src.onended = null; src.stop(); } catch { /* already stopped */ } currentSourceDone?.(); }
  if (context?.state === 'suspended') context.resume();
  try { globalThis.speechSynthesis?.cancel?.(); } catch { /* none */ }
}
export function resumePlayback() {
  currentAudio?.play().catch(() => {});
  if (context?.state === 'suspended') context.resume();
}

export async function playBlobAudio(blob, { rate = 1 } = {}) {
  const url = URL.createObjectURL(blob);
  try {
    const audio = new Audio(url);
    currentAudio = audio;
    // a character's own pitch (Conversation practice): a faster rate without pitch correction raises the voice
    if (rate !== 1) { audio.preservesPitch = false; audio.playbackRate = rate; }
    await new Promise((resolve, reject) => { audio.onended = resolve; audio.onerror = () => reject(new Error('audio failed')); audio.play().catch(reject); });
  } finally { if (currentAudio?.src === url) currentAudio = null; URL.revokeObjectURL(url); }
}

function defaultStore() {
  try { return globalThis.localStorage ?? null; } catch { return null; }
}

const ESPEAK_URL = 'https://cdn.jsdelivr.net/npm/@echogarden/espeak-ng-emscripten@0.3.5/espeak-ng.js';

/** The real loader: { synthesize(text, voice) -> { sampleRate, audio: Float32Array } }. */
export async function loadEspeakFromCdn() {
  const { default: init } = await import(/* @vite-ignore */ ESPEAK_URL);
  const m = await init();
  const worker = await new m.eSpeakNGWorker();
  return {
    async synthesize(text, voice) {
      worker.set_voice(voice);
      const chunks = [];
      worker.synthesize(text, (samples) => { if (samples?.length) chunks.push(samples); });
      const length = chunks.reduce((n, c) => n + c.length, 0);
      const audio = new Float32Array(length);
      let at = 0;
      for (const c of chunks) { for (let i = 0; i < c.length; i += 1) audio[at + i] = c[i] / 32768; at += c.length; }
      return { sampleRate: 22050, audio };
    },
  };
}

let context = null;
let currentSource = null;
let currentSourceDone = null;
export async function playPcm(audio, sampleRate) {
  context ??= new AudioContext();
  if (context.state === 'suspended') await context.resume();
  const buffer = context.createBuffer(1, audio.length, sampleRate);
  buffer.copyToChannel(audio, 0);
  const source = context.createBufferSource();
  source.buffer = buffer;
  source.connect(context.destination);
  currentSource = source;
  await new Promise((resolve) => { currentSourceDone = resolve; source.onended = resolve; source.start(); });
  if (currentSource === source) { currentSource = null; currentSourceDone = null; }
}

export function createVoice({ bcp47, espeakVoice, natural = null, synth = globalThis.speechSynthesis ?? null, loadEspeak = loadEspeakFromCdn, play = playPcm,
  loadPiper = null, playBlob = playBlobAudio, store = defaultStore(), timeoutMs = 30000 }) {
  // a voice fed with our own sounds (Macedonian through the Bulgarian voice) runs on its own small engine
  loadPiper ??= natural?.phonemes ? async () => createPhonemePiper({ phonemes: natural.phonemes }) : loadPiperFromCdn;
  // a natural voice the reader downloaded: remembered in the browser, so deciding the tier loads nothing
  const naturalKey = natural ? `casus:voice:${natural.voiceId}` : null;
  const naturalReady = () => { try { return !!naturalKey && store?.getItem(naturalKey) === 'stored'; } catch { return false; } };
  let piperLoad = null;
  async function piper() {
    piperLoad ??= withTimeout(loadPiper());
    try { return await piperLoad; } catch (e) { piperLoad = null; throw e; }
  }
  async function downloadNatural(progress = () => {}) {
    const p = await piper();
    await p.download(natural.voiceId, (x) => progress(x.total ? x.loaded / x.total : 0));
    progress(1);
    try { store?.setItem(naturalKey, 'stored'); } catch { /* storage refused */ }
    for (const fn of listeners) fn();
  }
  async function removeNatural() {
    const p = await piper();
    await p.remove(natural.voiceId);
    try { store?.removeItem(naturalKey); } catch { /* storage refused */ }
    for (const fn of listeners) fn();
  }
  // The tier is decided without downloading anything: espeak-ng (24 MB) loads on the first speak only
  // (review finding: deciding it on mount downloaded it whenever an entry opened).
  let engineLoad = null;
  function browserVoice() {
    if (!synth?.getVoices) return null;
    const lang = bcp47.toLowerCase();
    return synth.getVoices().find((v) => v.lang?.toLowerCase() === lang || v.lang?.toLowerCase().startsWith(`${lang}-`)) ?? null;
  }
  // Chrome lists no voices on the first call; they arrive with voiceschanged: listeners re-ask tier()
  const listeners = new Set();
  synth?.addEventListener?.('voiceschanged', () => { for (const fn of listeners) fn(); });
  function onchange(fn) { listeners.add(fn); return () => listeners.delete(fn); }
  async function tier() {
    if (naturalReady()) return 'natural';
    if (browserVoice()) return 'browser';
    return espeakVoice ? 'espeak' : null;
  }
  function withTimeout(p) {
    return Promise.race([p, new Promise((_, reject) => setTimeout(() => reject(new Error('timed out')), timeoutMs))]);
  }
  async function engine() {
    engineLoad ??= withTimeout(loadEspeak());
    try { return await engineLoad; } catch (e) { engineLoad = null; throw new Error(`no voice for ${bcp47}: espeak-ng could not be loaded (${e.message})`); }
  }
  let lastError = null;
  async function speak(text, { pitch = 1 } = {}) {
    let fellBack = false;
    lastError = null;
    if (naturalReady()) {
      let p = null;
      try {
        p = await piper();
        await (pitch === 1 ? playBlob(await p.predict({ text, voiceId: natural.voiceId })) : playBlob(await p.predict({ text, voiceId: natural.voiceId }), { rate: pitch }));
        return { tier: 'natural', fellBack: false };
      } catch (e) {
        fellBack = true;
        lastError = e?.message ?? String(e);
        // forget the voice only when the browser no longer has the model (review I7); otherwise keep it
        let missing = false;
        try { missing = !(await p?.stored?.() ?? [natural.voiceId]).includes(natural.voiceId); } catch { missing = false; }
        if (missing) {
          try { store?.removeItem(naturalKey); } catch { /* storage refused */ }
          for (const fn of listeners) fn();
        }
      }
    }
    const v = browserVoice();
    if (v) {
      const say = () => new Promise((resolve, reject) => {
        const u = new SpeechSynthesisUtterance(text);
        u.voice = v;
        u.lang = v.lang;
        if (pitch !== 1) u.pitch = Math.max(0, Math.min(2, pitch));
        u.onend = () => resolve();
        u.onerror = (e) => reject(new Error(e?.error ?? 'speech failed'));
        if (synth.speaking) synth.cancel?.();
        synth.speak(u);
      });
      // Chrome can report a fresh utterance as interrupted right after another one was cancelled: say it again once
      // (Allan, 2026-10-20: the button showed an error, a second click worked)
      try { await say(); } catch (e) { if (!/interrupted|canceled/.test(e.message)) throw e; await say(); }
      return { tier: 'browser', fellBack, error: lastError };
    }
    if (!espeakVoice) throw new Error(`no voice for ${bcp47}`);
    const e = await engine();
    const { audio, sampleRate } = await e.synthesize(text, espeakVoice);
    await play(audio, sampleRate * pitch);
    return { tier: 'espeak', fellBack, error: lastError };
  }
  return { tier, speak, onchange, natural, naturalReady, downloadNatural, removeNatural };
}
