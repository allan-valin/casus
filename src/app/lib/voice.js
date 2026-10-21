/*
 * The speaker (languages design §6, §11.3). Tiers, best first:
 *   1. a natural voice the reader downloaded (Piper; a later phase),
 *   2. the browser's own voice for the language (speechSynthesis),
 *   3. espeak-ng compiled to WebAssembly, loaded from jsDelivr the first time it is needed
 *      (GPL-3.0, robotic, but it speaks Latin, Ancient Greek and Macedonian),
 *   4. none: the button is disabled and says so.
 * No modern-language voice stands in for an ancient one.
 */
const PIPER_URL = 'https://cdn.jsdelivr.net/npm/@mintplex-labs/piper-tts-web@1.0.5/+esm';

/** Piper in the browser (MIT): download(voiceId, progress), predict({ text, voiceId }) -> WAV Blob, remove(voiceId). */
export async function loadPiperFromCdn() {
  return import(/* @vite-ignore */ PIPER_URL);
}

export async function playBlobAudio(blob, { rate = 1 } = {}) {
  const url = URL.createObjectURL(blob);
  try {
    const audio = new Audio(url);
    // a character's own pitch (Conversation practice): a faster rate without pitch correction raises the voice
    if (rate !== 1) { audio.preservesPitch = false; audio.playbackRate = rate; }
    await new Promise((resolve, reject) => { audio.onended = resolve; audio.onerror = () => reject(new Error('audio failed')); audio.play().catch(reject); });
  } finally { URL.revokeObjectURL(url); }
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
export async function playPcm(audio, sampleRate) {
  context ??= new AudioContext();
  if (context.state === 'suspended') await context.resume();
  const buffer = context.createBuffer(1, audio.length, sampleRate);
  buffer.copyToChannel(audio, 0);
  const source = context.createBufferSource();
  source.buffer = buffer;
  source.connect(context.destination);
  await new Promise((resolve) => { source.onended = resolve; source.start(); });
}

export function createVoice({ bcp47, espeakVoice, natural = null, synth = globalThis.speechSynthesis ?? null, loadEspeak = loadEspeakFromCdn, play = playPcm,
  loadPiper = loadPiperFromCdn, playBlob = playBlobAudio, store = defaultStore(), timeoutMs = 30000 }) {
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
  async function speak(text, { pitch = 1 } = {}) {
    let fellBack = false;
    if (naturalReady()) {
      let p = null;
      try {
        p = await piper();
        await (pitch === 1 ? playBlob(await p.predict({ text, voiceId: natural.voiceId })) : playBlob(await p.predict({ text, voiceId: natural.voiceId }), { rate: pitch }));
        return { tier: 'natural', fellBack: false };
      } catch {
        fellBack = true;
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
      return { tier: 'browser', fellBack };
    }
    if (!espeakVoice) throw new Error(`no voice for ${bcp47}`);
    const e = await engine();
    const { audio, sampleRate } = await e.synthesize(text, espeakVoice);
    await play(audio, sampleRate * pitch);
    return { tier: 'espeak', fellBack };
  }
  return { tier, speak, onchange, natural, naturalReady, downloadNatural, removeNatural };
}
