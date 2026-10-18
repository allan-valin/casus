import { describe, it, expect, vi } from 'vitest';
import { createVoice } from '../../src/app/lib/voice.js';

function fakeSynth(langs) {
  return { getVoices: () => langs.map((lang) => ({ lang, name: lang })), speak: vi.fn(), cancel: vi.fn() };
}
globalThis.SpeechSynthesisUtterance ??= class { constructor(text) { this.text = text; } };

describe('createVoice (languages design §6, §11.3)', () => {
  it('uses the browser voice when one matches the language', async () => {
    const synth = fakeSynth(['en-US', 'la-x-classical']);
    const v = createVoice({ bcp47: 'la', espeakVoice: 'la', synth, loadEspeak: vi.fn() });
    expect(await v.tier()).toBe('browser');
    await v.speak('rosa');
    expect(synth.speak).toHaveBeenCalledTimes(1);
    expect(synth.speak.mock.calls[0][0].lang).toBe('la-x-classical');
    expect(synth.speak.mock.calls[0][0].text).toBe('rosa');
  });
  it('falls back to espeak-ng when the browser has no voice for the language', async () => {
    const engine = { synthesize: vi.fn(async () => ({ sampleRate: 22050, audio: new Float32Array(10) })) };
    const play = vi.fn(async () => {});
    const v = createVoice({ bcp47: 'la', espeakVoice: 'la', synth: fakeSynth(['en-US']), loadEspeak: async () => engine, play });
    expect(await v.tier()).toBe('espeak');
    await v.speak('rosa');
    expect(engine.synthesize).toHaveBeenCalledWith('rosa', 'la');
    expect(play).toHaveBeenCalledWith(expect.any(Float32Array), 22050);
  });
  it('works without speechSynthesis at all (old WebView): espeak-ng', async () => {
    const engine = { synthesize: vi.fn(async () => ({ sampleRate: 22050, audio: new Float32Array(4) })) };
    const v = createVoice({ bcp47: 'grc', espeakVoice: 'grc', synth: null, loadEspeak: async () => engine, play: async () => {} });
    expect(await v.tier()).toBe('espeak');
  });
  it('has no tier when neither the browser nor espeak-ng can speak', async () => {
    const v = createVoice({ bcp47: 'la', espeakVoice: 'la', synth: fakeSynth([]), loadEspeak: async () => { throw new Error('offline'); } });
    expect(await v.tier()).toBe(null);
    await expect(v.speak('rosa')).rejects.toThrow(/no voice/);
  });
  it('loads espeak-ng once, however many words are spoken', async () => {
    const engine = { synthesize: vi.fn(async () => ({ sampleRate: 22050, audio: new Float32Array(1) })) };
    const loadEspeak = vi.fn(async () => engine);
    const v = createVoice({ bcp47: 'la', espeakVoice: 'la', synth: fakeSynth([]), loadEspeak, play: async () => {} });
    await v.speak('a'); await v.speak('b');
    expect(loadEspeak).toHaveBeenCalledTimes(1);
  });
});
