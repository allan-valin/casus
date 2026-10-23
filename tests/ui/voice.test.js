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
  it('an utterance Chrome reports as interrupted, after another was cancelled, is retried once, not shown as a failure (Allan, 2026-10-20)', async () => {
    const synth = fakeSynth(['la']);
    let first = true;
    synth.speak = vi.fn((u) => setTimeout(() => { if (first) { first = false; u.onerror?.({ error: 'interrupted' }); } else u.onend?.(); }, 0));
    const v = createVoice({ bcp47: 'la', espeakVoice: 'la', synth, loadEspeak: vi.fn() });
    expect(await v.speak('rosa')).toMatchObject({ tier: 'browser' });
    expect(synth.speak).toHaveBeenCalledTimes(2);
  });
  it('cancels only when something is being spoken', async () => {
    const synth = fakeSynth(['la']);
    synth.cancel = vi.fn(); synth.speaking = false;
    const v = createVoice({ bcp47: 'la', espeakVoice: 'la', synth, loadEspeak: vi.fn() });
    await v.speak('rosa');
    expect(synth.cancel).not.toHaveBeenCalled();
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

describe('natural voice tier (Piper, languages phase 3 Task 6)', () => {
  const natural = { voiceId: 'de_DE-thorsten-medium', name: 'Thorsten', sizeMB: 63 };
  function memory() { const m = new Map(); return { getItem: (k) => m.get(k) ?? null, setItem: (k, v) => m.set(k, v), removeItem: (k) => m.delete(k), m }; }
  function fakePiper() {
    return {
      download: vi.fn(async (id, progress) => { progress({ loaded: 50, total: 100 }); progress({ loaded: 100, total: 100 }); }),
      predict: vi.fn(async () => new Blob(['RIFF'], { type: 'audio/wav' })),
      remove: vi.fn(async () => {}),
    };
  }
  it('does not load the voice library to decide the tier', async () => {
    const loadPiper = vi.fn(async () => fakePiper());
    const v = createVoice({ bcp47: 'de', espeakVoice: 'de', natural, synth: fakeSynth(['de-DE']), loadPiper, store: memory() });
    expect(await v.tier()).toBe('browser');
    expect(loadPiper).not.toHaveBeenCalled();
  });
  it('downloads on request with progress, then speaks with it', async () => {
    const piper = fakePiper();
    const playBlob = vi.fn(async () => {});
    const store = memory();
    const v = createVoice({ bcp47: 'de', espeakVoice: 'de', natural, synth: fakeSynth(['de-DE']), loadPiper: async () => piper, playBlob, store });
    const seen = [];
    await v.downloadNatural((p) => seen.push(p));
    expect(seen.at(-1)).toBe(1);
    expect(await v.tier()).toBe('natural');
    await v.speak('das Haus');
    expect(piper.predict).toHaveBeenCalledWith({ text: 'das Haus', voiceId: 'de_DE-thorsten-medium' });
    expect(playBlob).toHaveBeenCalledTimes(1);
    expect(store.getItem('casus:voice:de_DE-thorsten-medium')).toBe('stored');
  });
  it('falls back to the browser voice when the stored model has gone, forgets it, tells its listeners and says which voice spoke', async () => {
    const piper = { ...fakePiper(), predict: vi.fn(async () => { throw new Error('not found'); }), stored: vi.fn(async () => []) };
    const store = memory(); store.setItem('casus:voice:de_DE-thorsten-medium', 'stored');
    const synth = fakeSynth(['de-DE']);
    const v = createVoice({ bcp47: 'de', espeakVoice: 'de', natural, synth, loadPiper: async () => piper, playBlob: async () => {}, store });
    const heard = vi.fn(); v.onchange(heard);
    expect(await v.speak('Haus')).toMatchObject({ tier: 'browser', fellBack: true, error: expect.any(String) });
    expect(synth.speak).toHaveBeenCalledTimes(1);
    expect(store.getItem('casus:voice:de_DE-thorsten-medium')).toBe(null);
    expect(heard).toHaveBeenCalled();
  });
  it('keeps the downloaded voice when it fails for another reason (offline, a slow start), and says it fell back (review I7)', async () => {
    const piper = { ...fakePiper(), predict: vi.fn(async () => { throw new Error('network'); }), stored: vi.fn(async () => ['de_DE-thorsten-medium']) };
    const store = memory(); store.setItem('casus:voice:de_DE-thorsten-medium', 'stored');
    const v = createVoice({ bcp47: 'de', espeakVoice: 'de', natural, synth: fakeSynth(['de-DE']), loadPiper: async () => piper, playBlob: async () => {}, store });
    expect(await v.speak('Haus')).toMatchObject({ tier: 'browser', fellBack: true, error: expect.any(String) });
    expect(store.getItem('casus:voice:de_DE-thorsten-medium')).toBe('stored');
  });
  it('removes the natural voice', async () => {
    const piper = fakePiper();
    const store = memory(); store.setItem('casus:voice:de_DE-thorsten-medium', 'stored');
    const v = createVoice({ bcp47: 'de', espeakVoice: 'de', natural, synth: fakeSynth([]), loadPiper: async () => piper, store });
    await v.removeNatural();
    expect(piper.remove).toHaveBeenCalledWith('de_DE-thorsten-medium');
    expect(await v.tier()).toBe('espeak');
  });
});

describe('a character’s own pitch (Conversation practice, Allan 2026-10-21: alter pitch to make another character)', () => {
  it('browser voice: the utterance carries the pitch', async () => {
    const synth = fakeSynth(['de-DE']);
    const v = createVoice({ bcp47: 'de', espeakVoice: 'de', synth, loadEspeak: vi.fn() });
    await v.speak('Hallo', { pitch: 1.3 });
    expect(synth.speak.mock.calls[0][0].pitch).toBe(1.3);
    await v.speak('Hallo');
    expect(synth.speak.mock.calls[1][0].pitch ?? 1).toBe(1);
  });
  it('espeak-ng: the samples play at a shifted rate', async () => {
    const play = vi.fn(async () => {});
    const v = createVoice({ bcp47: 'mk', espeakVoice: 'mk', synth: fakeSynth([]), play,
      loadEspeak: async () => ({ synthesize: async () => ({ sampleRate: 22050, audio: new Float32Array(4) }) }) });
    await v.speak('Здраво', { pitch: 1.2 });
    expect(play.mock.calls[0][1]).toBeCloseTo(22050 * 1.2);
  });
  it('natural voice: the clip plays at the pitch rate', async () => {
    const store = { m: new Map([['casus:voice:de_DE-thorsten-medium', 'stored']]), getItem(k) { return this.m.get(k) ?? null; }, setItem() {}, removeItem() {} };
    const playBlob = vi.fn(async () => {});
    const v = createVoice({ bcp47: 'de', espeakVoice: 'de', synth: fakeSynth([]), store, playBlob,
      natural: { voiceId: 'de_DE-thorsten-medium' }, loadPiper: async () => ({ predict: async () => new Blob(['x']) }) });
    await v.speak('Hallo', { pitch: 0.9 });
    expect(playBlob.mock.calls[0][1]).toEqual({ rate: 0.9 });
  });
});

describe('natural voices run on engine files of our own site, one pinned onnxruntime (Allan 2026-10-21)', () => {
  it('the Piper library comes from the installed package, and each voice gets a session on our engine folder', async () => {
    const { loadPiperEngine, ENGINE } = await import('../../src/app/lib/voice.js');
    expect(ENGINE).toMatch(/\/engine\/$/);
    expect(ENGINE).not.toMatch(/cdn|esm\.sh|cdnjs/);
    const made = [];
    const mod = { TtsSession: { _instance: { stale: true }, create: async (o) => { made.push({ ...o, cleared: mod.TtsSession._instance === null }); return { predict: async (text) => `wav:${text}` }; } } };
    const got = await loadPiperEngine(async () => mod);
    expect(await got.predict({ text: 'olá', voiceId: 'pt_BR-faber-medium' })).toBe('wav:olá');
    await got.predict({ text: 'de novo', voiceId: 'pt_BR-faber-medium' });
    expect(made).toHaveLength(1);                                  // one session per voice, reused
    expect(made[0]).toMatchObject({ cleared: true, voiceId: 'pt_BR-faber-medium',
      wasmPaths: { onnxWasm: ENGINE, piperData: `${ENGINE}piper_phonemize.data`, piperWasm: `${ENGINE}piper_phonemize.wasm` } });
  });
  it('no voice code points at a CDN', async () => {
    const fs = await import('node:fs');
    for (const f of ['src/app/lib/voice.js', 'src/app/lib/phonemePiper.js']) {
      const src = fs.readFileSync(f, 'utf8');
      expect(src, f).not.toMatch(/esm\.sh|cdnjs|jsdelivr\.net\/npm\/(onnxruntime|@mintplex|@diffusionstudio)/);
    }
  });
});

describe('voice downloads are complete before they count (Allan 2026-10-21: the library did not wait for its save)', () => {
  function fakeOpfs() {
    const files = new Map();
    const dir = {
      getFileHandle: async (name, o = {}) => {
        if (!files.has(name)) { if (!o.create) throw new Error('NotFound'); files.set(name, new Uint8Array(0)); }
        return { getFile: async () => new Blob([files.get(name)]), createWritable: async () => { let buf = []; return { write: async (b) => { buf.push(new Uint8Array(await b.arrayBuffer())); }, close: async () => { files.set(name, new Uint8Array(buf.flatMap((x) => [...x]))); } }; } };
      },
      removeEntry: async (name) => { files.delete(name); },
      entries: async function* () { for (const [k] of files) yield [k, { kind: 'file', getFile: async () => new Blob([files.get(k)]) }]; },
    };
    return { files, root: { getDirectoryHandle: async () => dir } };
  }
  it('download waits for the save and checks the size; stored() ignores an empty leftover', async () => {
    const { loadPiperEngine } = await import('../../src/app/lib/voice.js');
    const opfs = fakeOpfs();
    const mod = { HF_BASE: 'https://huggingface.co/x', PATH_MAP: { v: 'a/v.onnx' }, TtsSession: { create: async () => ({ predict: async () => 'wav' }) } };
    const fetchImpl = async (u) => new Response(u.endsWith('.json') ? '{"a":1}' : new Uint8Array([1, 2, 3, 4]), { headers: { 'Content-Length': u.endsWith('.json') ? '7' : '4' } });
    const got = await loadPiperEngine(async () => mod, { storage: async () => opfs.root, fetchImpl });
    opfs.files.set('v.onnx', new Uint8Array(0));                  // an empty leftover from an earlier failed save
    expect(await got.stored()).toEqual([]);
    await got.download('v');
    expect(opfs.files.get('v.onnx').length).toBe(4);
    expect(opfs.files.get('v.onnx.json').length).toBe(7);
    expect(await got.stored()).toEqual(['v']);
    await got.remove('v');
    expect(await got.stored()).toEqual([]);
  });
});

describe('downloadNatural checks the stored voice and tries again (Allan 2026-10-21: "a debug that checks the size and tries again")', () => {
  it('a download that is not complete afterwards is removed and tried again, up to three times, each attempt reported', async () => {
    const { createVoice } = await import('../../src/app/lib/voice.js');
    let tries = 0;
    const p = { download: async () => { tries += 1; }, stored: async () => (tries >= 2 ? ['v'] : []), remove: async () => {} };
    const store = new Map();
    const v = createVoice({ bcp47: 'pt', espeakVoice: 'pt', natural: { voiceId: 'v' }, loadPiper: async () => p,
      store: { getItem: (k) => store.get(k) ?? null, setItem: (k, x) => store.set(k, x), removeItem: (k) => store.delete(k) } });
    const attempts = [];
    await v.downloadNatural(() => {}, { onAttempt: (n, why) => attempts.push([n, why]) });
    expect(tries).toBe(2);
    expect(attempts.map(([n]) => n)).toEqual([1, 2]);
    expect(v.naturalReady()).toBe(true);
  });
  it('after three failed attempts it says why and is not marked stored', async () => {
    const { createVoice } = await import('../../src/app/lib/voice.js');
    const p = { download: async () => {}, stored: async () => [], remove: async () => {} };
    const store = new Map();
    const v = createVoice({ bcp47: 'pt', espeakVoice: 'pt', natural: { voiceId: 'v' }, loadPiper: async () => p,
      store: { getItem: (k) => store.get(k) ?? null, setItem: (k, x) => store.set(k, x), removeItem: (k) => store.delete(k) } });
    await expect(v.downloadNatural(() => {})).rejects.toThrow(/3/);
    expect(v.naturalReady()).toBe(false);
  });
});

describe('a pitched voice is stretched by its pitch, so the pitch does not speed it up (Allan 2026-10-21)', () => {
  it('our own engine gets lengthScale = the voice speed × the pitch', async () => {
    const { createVoice } = await import('../../src/app/lib/voice.js');
    const asked = [];
    const v = createVoice({ bcp47: 'mk', espeakVoice: 'mk', natural: { voiceId: 'v', phonemes: 'mk', speed: 1.1 }, store: { getItem: () => 'stored', setItem() {}, removeItem() {} },
      loadPiper: async () => ({ predict: async (o) => { asked.push(o); return new Blob(['x']); } }), playBlob: async () => {} });
    await v.speak('да', { pitch: 1.25 });
    expect(asked[0].lengthScale).toBeCloseTo(1.375);
  });
});

describe('a character speed slows the voice further', () => {
  it('lengthScale = voice speed × character speed × pitch', async () => {
    const { createVoice } = await import('../../src/app/lib/voice.js');
    const asked = [];
    const v = createVoice({ bcp47: 'mk', espeakVoice: 'mk', natural: { voiceId: 'v', phonemes: 'mk', speed: 1.1 }, store: { getItem: () => 'stored', setItem() {}, removeItem() {} },
      loadPiper: async () => ({ predict: async (o) => { asked.push(o); return new Blob(['x']); } }), playBlob: async () => {} });
    await v.speak('да', { pitch: 1.2, speed: 1.1 });
    expect(asked[0].lengthScale).toBeCloseTo(1.1 * 1.1 * 1.2);
  });
  it('the first sound gets a short silence before it, so its first syllable is not cut (Allan 2026-10-21)', async () => {
    const { padWav } = await import('../../src/app/lib/voice.js');
    const head = new Uint8Array(44); const dv = new DataView(head.buffer);
    [...'RIFF'].forEach((c, i) => { head[i] = c.charCodeAt(0); }); [...'WAVE'].forEach((c, i) => { head[8 + i] = c.charCodeAt(0); }); [...'data'].forEach((c, i) => { head[36 + i] = c.charCodeAt(0); });
    dv.setUint16(22, 1, true); dv.setUint32(24, 1000, true); dv.setUint16(34, 16, true); dv.setUint32(40, 4, true);
    const wav = new Blob([head, new Uint8Array([1, 2, 3, 4])], { type: 'audio/wav' });
    const out = new Uint8Array(await (await padWav(wav, 100)).arrayBuffer());
    expect(out.length).toBe(44 + 200 + 4);                       // 100 ms at 1000 Hz, 16-bit = 200 bytes of silence
    expect(new DataView(out.buffer).getUint32(40, true)).toBe(204);
    expect([...out.slice(-4)]).toEqual([1, 2, 3, 4]);
  });
});

describe('a sentence still being computed when you stop or skip is not played afterwards (Allan 2026-10-21: lag, two at once)', () => {
  it('stopPlayback during synthesis: the late sound is discarded', async () => {
    const { createVoice, stopPlayback } = await import('../../src/app/lib/voice.js');
    let finish;
    const played = [];
    const v = createVoice({ bcp47: 'pt', espeakVoice: 'pt', natural: { voiceId: 'v' }, store: { getItem: () => 'stored', setItem() {}, removeItem() {} },
      loadPiper: async () => ({ predict: () => new Promise((r) => { finish = () => r(new Blob(['x'])); }) }), playBlob: async (b) => { played.push(b); } });
    const said = v.speak('olá');
    await new Promise((r) => setTimeout(r, 0));
    stopPlayback();                    // ⏭ pressed while the sentence was being computed
    finish();
    const res = await said;
    expect(played).toHaveLength(0);
    expect(res.tier).toBe('natural');
    expect(res.dropped).toBe(true);
  });
});

describe('a pause pressed while a sentence is computed holds it until resume', () => {
  it('playBlobAudio does not start while paused; resume starts it', async () => {
    const { playBlobAudio, pausePlayback, resumePlayback, stopPlayback } = await import('../../src/app/lib/voice.js');
    const started = [];
    globalThis.URL.createObjectURL ??= () => 'blob:x';
    globalThis.URL.revokeObjectURL ??= () => {};
    globalThis.Audio = class { constructor() { this.paused = true; } play() { started.push(1); this.paused = false; setTimeout(() => this.onended?.(), 0); return Promise.resolve(); } pause() { this.paused = true; } };
    pausePlayback();
    const done = playBlobAudio(new Blob(['x']));
    await new Promise((r) => setTimeout(r, 5));
    expect(started).toHaveLength(0);
    resumePlayback();
    await done;
    expect(started).toHaveLength(1);
    stopPlayback();
  });
});

describe('the course can hand the natural voice its own sounds and a speaker (Japanese, Allan 2026-10-22)', () => {
  it('phonemes and speaker reach the engine; the browser voice still gets the text', async () => {
    const { createVoice } = await import('../../src/app/lib/voice.js');
    const asked = [];
    const v = createVoice({ bcp47: 'ja', espeakVoice: 'ja', natural: { voiceId: 'v', phonemes: 'ja' }, store: { getItem: () => 'stored', setItem() {}, removeItem() {} },
      loadPiper: async () => ({ predict: async (o) => { asked.push(o); return new Blob(['x']); } }), playBlob: async () => {} });
    await v.speak('かさ', { phonemes: 'ka↑sa.', speaker: 'female' });
    expect(asked[0]).toMatchObject({ text: 'かさ', phonemes: 'ka↑sa.', speaker: 'female' });
  });
});
