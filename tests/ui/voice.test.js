import { describe, it, expect, vi } from 'vitest';
import { createVoice } from '../../src/app/lib/voice.js';

function fakeSynth(langs, { fail = false } = {}) {
  const listeners = {};
  return {
    voices: langs.map((lang) => ({ lang, name: lang })),
    getVoices() { return this.voices; },
    addEventListener: (ev, fn) => { listeners[ev] = fn; },
    fire: (ev) => listeners[ev]?.(),
    speak: vi.fn((u) => setTimeout(() => (fail ? u.onerror?.({ error: 'synthesis-failed' }) : u.onend?.()), 0)),
    cancel: vi.fn(),
  };
}
globalThis.SpeechSynthesisUtterance ??= class { constructor(text) { this.text = text; } };

describe('createVoice (languages design §6, §11.3; review fixes)', () => {
  it('uses the browser voice when one matches the language, and resolves when the utterance ends', async () => {
    const synth = fakeSynth(['en-US', 'la-x-classical']);
    const v = createVoice({ bcp47: 'la', espeakVoice: 'la', synth, loadEspeak: vi.fn() });
    expect(await v.tier()).toBe('browser');
    await v.speak('rosa');
    expect(synth.speak.mock.calls[0][0].lang).toBe('la-x-classical');
  });
  it('rejects when the browser voice fails, instead of claiming it spoke', async () => {
    const v = createVoice({ bcp47: 'la', espeakVoice: 'la', synth: fakeSynth(['la'], { fail: true }), loadEspeak: vi.fn() });
    await expect(v.speak('rosa')).rejects.toThrow(/synthesis-failed/);
  });
  it('picks up voices that arrive later (voiceschanged)', async () => {
    const synth = fakeSynth([]);
    const v = createVoice({ bcp47: 'la', espeakVoice: 'la', synth, loadEspeak: vi.fn() });
    expect(await v.tier()).toBe('espeak');
    synth.voices = [{ lang: 'la', name: 'la' }];
    const heard = vi.fn();
    v.onchange(heard);
    synth.fire('voiceschanged');
    expect(heard).toHaveBeenCalledTimes(1);
    expect(await v.tier()).toBe('browser');
  });
  it('does not load espeak-ng to decide the tier: only the first speak loads it', async () => {
    const engine = { synthesize: vi.fn(async () => ({ sampleRate: 22050, audio: new Float32Array(10) })) };
    const loadEspeak = vi.fn(async () => engine);
    const play = vi.fn(async () => {});
    const v = createVoice({ bcp47: 'la', espeakVoice: 'la', synth: fakeSynth(['en-US']), loadEspeak, play });
    expect(await v.tier()).toBe('espeak');
    expect(loadEspeak).not.toHaveBeenCalled();
    await v.speak('rosa'); await v.speak('urbs');
    expect(loadEspeak).toHaveBeenCalledTimes(1);
    expect(engine.synthesize).toHaveBeenCalledWith('rosa', 'la');
    expect(play).toHaveBeenCalledWith(expect.any(Float32Array), 22050);
  });
  it('works without speechSynthesis at all (old WebView): espeak-ng', async () => {
    const v = createVoice({ bcp47: 'grc', espeakVoice: 'grc', synth: null, loadEspeak: async () => ({ synthesize: async () => ({ sampleRate: 22050, audio: new Float32Array(1) }) }), play: async () => {} });
    expect(await v.tier()).toBe('espeak');
  });
  it('a failed espeak-ng load rejects with "no voice" and is retried on the next speak', async () => {
    let calls = 0;
    const loadEspeak = vi.fn(async () => { calls += 1; if (calls === 1) throw new Error('offline'); return { synthesize: async () => ({ sampleRate: 22050, audio: new Float32Array(1) }) }; });
    const v = createVoice({ bcp47: 'la', espeakVoice: 'la', synth: fakeSynth([]), loadEspeak, play: async () => {} });
    await expect(v.speak('rosa')).rejects.toThrow(/no voice/);
    await v.speak('rosa');
    expect(loadEspeak).toHaveBeenCalledTimes(2);
  });
  it('gives up on a load that hangs', async () => {
    const v = createVoice({ bcp47: 'la', espeakVoice: 'la', synth: fakeSynth([]), loadEspeak: () => new Promise(() => {}), timeoutMs: 20 });
    await expect(v.speak('rosa')).rejects.toThrow(/no voice/);
  });
  it('has no tier when the language has neither a browser voice nor an espeak-ng voice', async () => {
    const v = createVoice({ bcp47: 'xx', espeakVoice: null, synth: fakeSynth([]) });
    expect(await v.tier()).toBe(null);
  });
});
