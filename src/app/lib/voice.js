/*
 * The speaker (languages design §6, §11.3). Tiers, best first:
 *   1. a natural voice the reader downloaded (Piper; a later phase),
 *   2. the browser's own voice for the language (speechSynthesis),
 *   3. espeak-ng compiled to WebAssembly, loaded from jsDelivr the first time it is needed
 *      (GPL-3.0, robotic, but it speaks Latin, Ancient Greek and Macedonian),
 *   4. none: the button is disabled and says so.
 * No modern-language voice stands in for an ancient one.
 */
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

export function createVoice({ bcp47, espeakVoice, synth = globalThis.speechSynthesis ?? null, loadEspeak = loadEspeakFromCdn, play = playPcm }) {
  let engine = null;
  let engineLoad = null;
  let decided = null;

  function browserVoice() {
    if (!synth?.getVoices) return null;
    const lang = bcp47.toLowerCase();
    return synth.getVoices().find((v) => v.lang?.toLowerCase() === lang || v.lang?.toLowerCase().startsWith(`${lang}-`)) ?? null;
  }
  async function espeak() {
    if (!espeakVoice) return null;
    engineLoad ??= loadEspeak().then((e) => { engine = e; return e; }, () => null);
    return engineLoad;
  }
  async function tier() {
    if (decided !== null) return decided || null;
    if (browserVoice()) decided = 'browser';
    else decided = (await espeak()) ? 'espeak' : false;
    return decided || null;
  }
  async function speak(text) {
    const which = await tier();
    if (which === 'browser') {
      const v = browserVoice();
      const u = new SpeechSynthesisUtterance(text);
      u.voice = v;
      u.lang = v.lang;
      synth.cancel?.();
      synth.speak(u);
      return;
    }
    if (which === 'espeak') {
      const { audio, sampleRate } = await engine.synthesize(text, espeakVoice);
      await play(audio, sampleRate);
      return;
    }
    throw new Error(`no voice for ${bcp47}`);
  }
  return { tier, speak };
}
