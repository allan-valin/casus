// @vitest-environment jsdom
import { describe, it, expect, afterEach } from 'vitest';
import { render, fireEvent } from '@testing-library/svelte';
import { tick } from 'svelte';
import Talk from '../../src/app/components/Talk.svelte';
import PracticeStub from '../fixtures/PracticeStub.svelte';
import EntryStub from '../fixtures/EntryStub.svelte';
import VoiceStub from '../fixtures/VoiceStub.svelte';
import { getLanguage } from '../../src/lang/registry.js';
import { langFromPath, talkPath } from '../../src/app/lib/route.js';
import { setLang } from '../../src/app/lib/i18n.svelte.js';

const flush = async () => { for (let i = 0; i < 10; i += 1) { await tick(); await new Promise((r) => setTimeout(r, 0)); } };
const store = () => { const m = new Map(); return { getItem: (k) => m.get(k) ?? null, setItem: (k, v) => m.set(k, String(v)), m }; };
const COURSE = {
  language: 'de', example: true, narrator_languages: ['pt', 'en'],
  cast: { becker: { name: 'Frau Becker' }, protagonist: { name: null } },
  units: [
    { id: 'A1-01', level: 'A1', number: 1, title: { pt: 'A dona do apartamento', en: 'The landlady' }, situation: { pt: 'Você chegou.', en: 'You arrived.' },
      new_items: [{ id: 'danke', text: 'Danke', meaning: { pt: 'Obrigada', en: 'Thank you' } }, { id: 'ent', text: 'Entschuldigung', meaning: { pt: 'Desculpe', en: 'Sorry' } }],
      steps: [
        { type: 'narrator', text: { pt: 'Escute.', en: 'Listen.' } },
        { type: 'dialogue', lines: [{ speaker: 'becker', text: 'Guten Tag.', meaning: { pt: 'Boa tarde.', en: 'Hello.' } }, { speaker: 'protagonist', text: 'Danke!', meaning: { pt: 'Obrigada!', en: 'Thanks!' } }] },
        { type: 'line', speaker: 'becker', item: 'danke' },
        { type: 'buildup', item: 'ent', parts: ['-gung', '-digung', 'Entschuldigung'] },
        { type: 'prompt', ask: { pt: 'Agradeça.', en: 'Thank her.' }, answer: { speaker: 'protagonist', text: 'Danke!' }, items: ['danke'] },
        { type: 'dialogue', again: true },
        { type: 'selfcheck' },
      ] },
    { id: 'A1-02', level: 'A1', number: 2, title: { pt: 'Domingo', en: 'Sunday' }, situation: { pt: 'Domingo.', en: 'Sunday.' }, new_items: [], steps: [] },
  ],
};

function props(extra = {}) {
  const spoken = [];
  const said = [];
  return {
    spoken, said,
    p: { lang: getLanguage('de'), storage: store(), loadTalk: async () => COURSE,
      speakTaught: async (text) => { spoken.push(['de', text]); }, speakNarrator: async (text, l) => { spoken.push([l, text]); },
      trainerHref: (text) => `/de/speak/#${encodeURIComponent(text)}`, say: (msg, kind) => said.push([msg, kind]), pause: () => Promise.resolve(), ...extra },
  };
}
afterEach(() => setLang('en'));

describe('Conversation practice tab (Allan, 2026-10-20/21: narrator in the interface language, text hidden until clicked)', () => {
  it('lives at /<code>/talk/', () => {
    expect(langFromPath('/de/talk/', '/')).toEqual({ code: 'de', view: 'talk' });
    expect(talkPath({ path: '/de/' })).toBe('/de/talk/');
  });

  it('with no course yet it says so and links the writers’ guide in every interface language', async () => {
    const { p } = props({ loadTalk: async () => null });
    const { container } = render(Talk, p);
    await flush();
    expect(container.querySelector('.talk-none')).not.toBeNull();
    const guides = [...container.querySelectorAll('a.guide')].map((a) => a.getAttribute('href'));
    for (const l of ['en', 'pt-BR', 'de', 'mk', 'ar']) expect(guides.some((h) => h.endsWith(`GUIDE.${l}.md`))).toBe(true);
  });

  it('lists the units by level, marks example courses, and opens a unit', async () => {
    setLang('pt');
    const { p } = props();
    const { container } = render(Talk, p);
    await flush();
    expect(container.querySelector('.talk-example')).not.toBeNull();
    const rows = [...container.querySelectorAll('.unit-row')];
    expect(rows.map((r) => r.dataset.unit)).toEqual(['A1-01', 'A1-02']);
    expect(rows[0].textContent).toContain('A dona do apartamento');
    await fireEvent.click(rows[0]);
    await flush();
    expect(container.querySelector('.unit-page h3').textContent).toContain('A dona do apartamento');
    expect(container.querySelectorAll('.step').length).toBe(7);
  });

  it('taught-language text is hidden until clicked, then shows with its meaning; a second click hides it', async () => {
    setLang('pt');
    const { p } = props();
    const { container } = render(Talk, p);
    await flush();
    await fireEvent.click(container.querySelector('.unit-row'));
    await flush();
    const line = container.querySelector('.step[data-type="line"]');
    expect(line.querySelector('.taught')).toBeNull();
    await fireEvent.click(line.querySelector('.reveal'));
    expect(line.querySelector('.taught').textContent).toBe('Danke');
    expect(line.querySelector('.meaning').textContent).toBe('Obrigada');
    expect(line.querySelector('a.trainer').getAttribute('href')).toBe('/de/speak/#Danke');
    await fireEvent.click(line.querySelector('.reveal'));
    expect(line.querySelector('.taught')).toBeNull();
  });

  it('▶ speaks: narrator in the interface language, characters in the taught language, dialogue line by line, build-up piece by piece', async () => {
    setLang('pt');
    const { p, spoken, said } = props();
    const { container } = render(Talk, p);
    await flush();
    await fireEvent.click(container.querySelector('.unit-row'));
    await flush();
    const play = (type) => fireEvent.click(container.querySelector(`.step[data-type="${type}"] .play`));
    await play('narrator'); await flush();
    await play('dialogue'); await flush();
    await play('buildup'); await flush();
    expect(spoken).toEqual([['pt', 'Escute.'], ['de', 'Guten Tag.'], ['de', 'Danke!'], ['de', '-gung'], ['de', '-digung'], ['de', 'Entschuldigung']]);
    expect(said.length).toBeGreaterThanOrEqual(3);
  });

  it('a narrator language the course lacks falls back to the first narrator language, and says so', async () => {
    setLang('mk');
    const { p, spoken } = props();
    const { container } = render(Talk, p);
    await flush();
    expect(container.querySelector('.narrator-fallback')).not.toBeNull();
    await fireEvent.click(container.querySelector('.unit-row'));
    await flush();
    await fireEvent.click(container.querySelector('.step[data-type="narrator"] .play'));
    await flush();
    expect(spoken[0]).toEqual(['pt', 'Escute.']);
  });

  it('a prompt asks first; the answer appears and plays only on request; no typing box (Allan 2026-10-21)', async () => {
    setLang('en');
    const { p, spoken } = props();
    const { container } = render(Talk, p);
    await flush();
    await fireEvent.click(container.querySelector('.unit-row'));
    await flush();
    const prompt = container.querySelector('.step[data-type="prompt"]');
    expect(prompt.querySelector('.ask').textContent).toBe('Thank her.');
    expect(prompt.querySelector('.taught')).toBeNull();
    expect(prompt.querySelector('input')).toBeNull();
    await fireEvent.click(prompt.querySelector('.answer'));
    await flush();
    expect(prompt.querySelector('.taught').textContent).toBe('Danke!');
    expect(spoken.at(-1)).toEqual(['de', 'Danke!']);
  });

  it('every prompt opens the pronunciation helper in place, on the answer (Allan 2026-10-21)', async () => {
    const { p } = props({ Practice: PracticeStub });
    const { container } = render(Talk, p);
    await flush();
    await fireEvent.click(container.querySelector('.unit-row'));
    await flush();
    const prompt = container.querySelector('.step[data-type="prompt"]');
    expect(prompt.querySelector('.practice-stub')).toBeNull();
    await fireEvent.click(prompt.querySelector('.practise'));
    await flush();
    expect(prompt.querySelector('.practice-stub').textContent).toBe('Danke!');
    await fireEvent.click(prompt.querySelector('.practise'));
    await flush();
    expect(prompt.querySelector('.practice-stub')).toBeNull();
  });

  it('▶ becomes ⏸ while playing; ⏸ pauses the voice, ▶ resumes it (Allan 2026-10-21)', async () => {
    let finish;
    const calls = [];
    const { p } = props({ speakNarrator: () => new Promise((r) => { finish = r; }), control: { pause: () => calls.push('pause'), resume: () => calls.push('resume') } });
    const { container } = render(Talk, p);
    await flush();
    await fireEvent.click(container.querySelector('.unit-row'));
    await flush();
    const btn = () => container.querySelector('.step[data-type="narrator"] .play');
    await fireEvent.click(btn());
    await flush();
    expect(btn().classList.contains('playing')).toBe(true);
    await fireEvent.click(btn());
    expect(calls).toEqual(['pause']);
    expect(btn().classList.contains('paused')).toBe(true);
    await fireEvent.click(btn());
    expect(calls).toEqual(['pause', 'resume']);
    finish();
    await flush();
    expect(btn().classList.contains('playing')).toBe(false);
  });

  it('before a unit, the natural voices are offered for download instead of the robotic fallback (Allan 2026-10-21)', async () => {
    let ready = false;
    const downloads = [];
    const voice = { natural: { name: 'Dimitar', sizeMB: 63 }, naturalReady: () => ready, downloadNatural: async (pr) => { downloads.push('mk'); pr?.(1); ready = true; } };
    const { p } = props({ voices: [voice] });
    const { container } = render(Talk, p);
    await flush();
    await fireEvent.click(container.querySelector('.unit-row'));
    await flush();
    expect(container.querySelector('.voice-gate')).not.toBeNull();
    expect(container.querySelector('.voice-gate').textContent).toContain('Dimitar');
    await fireEvent.click(container.querySelector('.voice-gate .get-voices'));
    await flush();
    expect(downloads).toEqual(['mk']);
    expect(container.querySelector('.voice-gate')).toBeNull();
  });

  it('a How-this-works panel explains every button, open on the first visit', async () => {
    const { p } = props();
    const { container } = render(Talk, p);
    await flush();
    const help = container.querySelector('details.howto');
    expect(help.open).toBe(true);
    for (const k of ['▶', '⏸', '🎤']) expect(help.textContent).toContain(k);
    expect(p.storage.getItem('casus:talk:help-seen')).toBe('1');
  });

  it('the last step clicked keeps a highlighted background, so you do not lose your place (Allan 2026-10-21)', async () => {
    const { p } = props();
    const { container } = render(Talk, p);
    await flush();
    await fireEvent.click(container.querySelector('.unit-row'));
    await flush();
    await fireEvent.click(container.querySelector('.step[data-type="line"] .play'));
    await flush();
    expect([...container.querySelectorAll('.step.current')].map((e) => e.dataset.type)).toEqual(['line']);
    await fireEvent.click(container.querySelector('.step[data-type="prompt"] .answer'));
    await flush();
    expect([...container.querySelectorAll('.step.current')].map((e) => e.dataset.type)).toEqual(['prompt']);
  });

  it('a player bar at the bottom: ⏭ and ⏮ move to the next and previous step and play it (Allan 2026-10-21)', async () => {
    const { p, spoken } = props();
    const { container } = render(Talk, p);
    await flush();
    await fireEvent.click(container.querySelector('.unit-row'));
    await flush();
    const bar = container.querySelector('.player-bar');
    expect(bar).not.toBeNull();
    await fireEvent.click(bar.querySelector('.next'));
    await flush();
    expect(container.querySelector('.step.current').dataset.type).toBe('narrator');
    expect(spoken.at(-1)).toEqual(['en', 'Listen.']);
    await fireEvent.click(bar.querySelector('.next'));
    await flush();
    expect(container.querySelector('.step.current').dataset.type).toBe('dialogue');
    await fireEvent.click(bar.querySelector('.prev'));
    await flush();
    expect(container.querySelector('.step.current').dataset.type).toBe('narrator');
    expect(bar.querySelector('.where').textContent).toContain('1');
  });

  it('hands-free: steps play one after another; a question waits 10 seconds, then gives its answer (Allan 2026-10-21)', async () => {
    const waits = [];
    const { p, spoken } = props({ pause: (ms) => { waits.push(ms); return Promise.resolve(); } });
    const { container } = render(Talk, p);
    await flush();
    await fireEvent.click(container.querySelector('.unit-row'));
    await flush();
    const toggle = container.querySelector('.hands-free');
    expect(toggle.textContent.length).toBeGreaterThan(5);
    await fireEvent.click(toggle);
    for (let i = 0; i < 20; i += 1) await flush();
    const texts = spoken.map(([, t]) => t);
    expect(texts.slice(0, 2)).toEqual(['Listen.', 'Guten Tag.']);
    const ask = texts.indexOf('Thank her.');
    expect(ask).toBeGreaterThan(0);
    expect(texts[ask + 1]).toBe('Danke!');                 // the answer, after the wait
    expect(waits).toContain(5000);
    expect(container.querySelector('.step.current').dataset.type).toBe('selfcheck');   // stops at the self-check
  });

  it('the lock-screen controls (Media Session) drive the same player', async () => {
    const handlers = {};
    globalThis.navigator.mediaSession = { setActionHandler: (a, f) => { handlers[a] = f; }, metadata: null };
    globalThis.MediaMetadata = class { constructor(o) { Object.assign(this, o); } };
    const { p, spoken } = props();
    const { container } = render(Talk, p);
    await flush();
    await fireEvent.click(container.querySelector('.unit-row'));
    await flush();
    expect(Object.keys(handlers)).toEqual(expect.arrayContaining(['play', 'pause', 'nexttrack', 'previoustrack']));
    expect(navigator.mediaSession.metadata.title).toContain('A1-01');
    handlers.nexttrack();
    await flush();
    expect(spoken.at(-1)).toEqual(['en', 'Listen.']);
    delete globalThis.navigator.mediaSession;
  });

  it('narrator steps for other audiences and units of other tracks are left out (Allan 2026-10-21: neutral English)', async () => {
    setLang('en');
    const course = { ...COURSE, units: [
      { ...COURSE.units[0], steps: [{ type: 'narrator', text: { en: 'Listen.', pt: 'Escute.' } }, { type: 'narrator', for: ['pt'], text: { pt: 'No Brasil é diferente.' } }, { type: 'selfcheck' }] },
      { ...COURSE.units[1], id: 'A1-02', tracks: ['pt'] },
    ] };
    const { p } = props({ loadTalk: async () => course });
    const { container } = render(Talk, p);
    await flush();
    expect([...container.querySelectorAll('.unit-row')].map((r) => r.dataset.unit)).toEqual(['A1-01']);
    await fireEvent.click(container.querySelector('.unit-row'));
    await flush();
    expect(container.querySelectorAll('.step[data-type="narrator"]').length).toBe(1);
  });

  it('starting another step stops the paused one — never two at once (Allan 2026-10-21 bug)', async () => {
    let release;
    const said = [];
    const calls = [];
    const speakTaught = (text) => { said.push(text); return text === 'Guten Tag.' ? new Promise((r) => { release = r; }) : Promise.resolve(); };
    const { p } = props({ speakTaught, control: { pause: () => calls.push('pause'), resume: () => calls.push('resume'), stop: () => calls.push('stop') } });
    const { container } = render(Talk, p);
    await flush();
    await fireEvent.click(container.querySelector('.unit-row'));
    await flush();
    const dlg = container.querySelector('.step[data-type="dialogue"] .play');
    await fireEvent.click(dlg);              // plays 'Guten Tag.' (held)
    await flush();
    await fireEvent.click(dlg);              // pause
    await fireEvent.click(container.querySelector('.step[data-type="line"] .play'));   // another step
    await flush();
    expect(calls).toContain('stop');
    release();                               // the held line ends
    for (let i = 0; i < 5; i += 1) await flush();
    expect(said).toEqual(['Guten Tag.', 'Danke']);   // the dialogue's second line never plays
  });

  it('when the natural voice fails, the tab says so with the reason (Allan 2026-10-21: "still the robot voice")', async () => {
    const { p, said } = props({ speakTaught: async () => ({ tier: 'espeak', fellBack: true, error: 'onnx failed' }) });
    const { container } = render(Talk, p);
    await flush();
    await fireEvent.click(container.querySelector('.unit-row'));
    await flush();
    await fireEvent.click(container.querySelector('.step[data-type="line"] .play'));
    await flush();
    expect(said.some(([m, k]) => k === 'err' && m.includes('onnx failed'))).toBe(true);
  });

  it('shown words open their dictionary entry; non-Latin text gets its romanization below (Allan 2026-10-21)', async () => {
    const lang = { ...getLanguage('de'), script: { ...getLanguage('de').script, romanize: (w) => w.toUpperCase() } };
    const { p } = props({ lang, Entry: EntryStub });
    const { container } = render(Talk, p);
    await flush();
    await fireEvent.click(container.querySelector('.unit-row'));
    await flush();
    const dlg = container.querySelector('.step[data-type="dialogue"]');
    await fireEvent.click(dlg.querySelector('.reveal'));
    await flush();
    const words = [...dlg.querySelectorAll('button.w')].map((b) => b.textContent);
    expect(words.slice(0, 2)).toEqual(['Guten', 'Tag']);
    expect(dlg.querySelector('.roman').textContent).toContain('GUTEN TAG');
    await fireEvent.click(dlg.querySelector('button.w'));
    await flush();
    expect(dlg.querySelector('.entry-stub').textContent).toBe('Guten');
  });

  it('a ⚙ voices panel manages each voice the course uses: download, delete, download again (Allan 2026-10-21)', async () => {
    const mk = { natural: { name: 'Dimitar' }, naturalReady: () => true };
    const pt = { natural: { name: 'Faber' }, naturalReady: () => true };
    const { p } = props({ VoiceBox: VoiceStub, voices: [mk], narratorVoiceOf: () => pt });
    const { container } = render(Talk, p);
    await flush();
    const gear = container.querySelector('details.voice-gear');
    expect(gear.querySelector('summary').textContent).toContain('⚙');
    expect([...gear.querySelectorAll('.voice-stub')].map((e) => e.textContent)).toEqual(['Dimitar', 'Faber']);
  });

  it('narration speaks the taught-language words with the taught voice: other alphabets found by themselves, «…» marks any (Allan 2026-10-21)', async () => {
    setLang('en');
    const spoken = [];
    const lang = { ...getLanguage('mk') };
    const course = { ...COURSE, language: 'mk', units: [{ ...COURSE.units[0], steps: [
      { type: 'narrator', text: { en: "To greet, say 'Добар ден'. Listen." } },
      { type: 'narrator', text: { en: 'In German: «Guten Tag».' } }, { type: 'selfcheck' }] }] };
    const { p } = props({ lang, loadTalk: async () => course, speakTaught: async (t) => { spoken.push(['taught', t]); }, speakNarrator: async (t) => { spoken.push(['narrator', t]); } });
    const { container } = render(Talk, p);
    await flush();
    await fireEvent.click(container.querySelector('.unit-row'));
    await flush();
    const plays = container.querySelectorAll('.step[data-type="narrator"] .play');
    await fireEvent.click(plays[0]);
    await flush();
    expect(spoken).toEqual([['narrator', "To greet, say"], ['taught', 'Добар ден'], ['narrator', 'Listen.']]);
    spoken.length = 0;
    await fireEvent.click(plays[1]);
    await flush();
    expect(spoken).toEqual([['narrator', 'In German:'], ['taught', 'Guten Tag']]);
    expect(container.querySelectorAll('.step[data-type="narrator"]')[1].textContent).not.toContain('«');
  });

  it('hands-free: a pause holds the whole run — the next step does not start until resumed (Allan 2026-10-21 bug)', async () => {
    const spoken = [];
    let hold;
    const speakNarrator = async (t) => { spoken.push(t); if (t === 'Listen.') await new Promise((r) => { hold = r; }); };
    const { p } = props({ speakNarrator, speakTaught: async (t) => { spoken.push(t); }, control: { pause: () => {}, resume: () => {}, stop: () => {} } });
    const { container } = render(Talk, p);
    await flush();
    await fireEvent.click(container.querySelector('.unit-row'));
    await flush();
    await fireEvent.click(container.querySelector('.hands-free'));
    await flush();
    await fireEvent.click(container.querySelector('.player-bar .playpause'));   // pause during the first step
    hold();                                                                      // its sentence ends anyway
    for (let i = 0; i < 10; i += 1) await flush();
    expect(spoken).toEqual(['Listen.']);                                         // nothing new while paused
    await fireEvent.click(container.querySelector('.player-bar .playpause'));   // resume
    for (let i = 0; i < 10; i += 1) await flush();
    expect(spoken.slice(0, 2)).toEqual(['Listen.', 'Guten Tag.']);
  });

  it('each step shows its number left of ▶', async () => {
    const { p } = props();
    const { container } = render(Talk, p);
    await flush();
    await fireEvent.click(container.querySelector('.unit-row'));
    await flush();
    expect([...container.querySelectorAll('.step .num')].slice(0, 3).map((e) => e.textContent)).toEqual(['1', '2', '3']);
  });

  it('hands-free plays each step exactly once, in order (Allan 2026-10-21: "it presses play twice and skips")', async () => {
    const spoken = [];
    const later = (t) => new Promise((r) => setTimeout(() => { spoken.push(t); r(); }, 5));
    const { p } = props({ speakNarrator: later, speakTaught: later, pause: () => new Promise((r) => setTimeout(r, 1)),
      control: { pause: () => {}, resume: () => {}, stop: () => {} } });
    const { container } = render(Talk, p);
    await flush();
    await fireEvent.click(container.querySelector('.unit-row'));
    await flush();
    await fireEvent.click(container.querySelector('.hands-free'));
    for (let i = 0; i < 400 && container.querySelector('.hands-free.on'); i += 1) await new Promise((r) => setTimeout(r, 5));
    expect(spoken).toEqual(['Listen.', 'Guten Tag.', 'Danke!', 'Danke', '-gung', '-digung', 'Entschuldigung', 'Thank her.', 'Danke!', 'Guten Tag.', 'Danke!']);
  });

  it('lock-screen play and pause are not toggles: play while playing, or pause while paused, change nothing (Allan 2026-10-21 phone bug)', async () => {
    const handlers = {};
    globalThis.navigator.mediaSession = { setActionHandler: (a, f) => { handlers[a] = f; }, metadata: null, playbackState: 'none' };
    globalThis.MediaMetadata = class { constructor(o) { Object.assign(this, o); } };
    let release;
    const spoken = [];
    const calls = [];
    const { p } = props({ speakNarrator: (t) => { spoken.push(t); return new Promise((r) => { release = r; }); },
      control: { pause: () => calls.push('pause'), resume: () => calls.push('resume'), stop: () => calls.push('stop') } });
    const { container } = render(Talk, p);
    await flush();
    await fireEvent.click(container.querySelector('.unit-row'));
    await flush();
    await fireEvent.click(container.querySelector('.hands-free'));
    await flush();
    handlers.play();                 // the phone says "play" while it plays
    await flush();
    expect(calls).not.toContain('pause');
    expect(spoken).toEqual(['Listen.']);
    expect(navigator.mediaSession.playbackState).toBe('playing');
    handlers.pause(); handlers.pause();
    await flush();
    expect(calls.filter((c) => c === 'pause')).toHaveLength(1);
    expect(navigator.mediaSession.playbackState).toBe('paused');
    handlers.play();
    await flush();
    expect(calls).toContain('resume');
    release();
    delete globalThis.navigator.mediaSession;
  });

  it('the self-check marks the unit done, kept in the browser and shown in the list', async () => {
    const { p } = props();
    const { container } = render(Talk, p);
    await flush();
    await fireEvent.click(container.querySelector('.unit-row'));
    await flush();
    await fireEvent.click(container.querySelector('.step[data-type="selfcheck"] .done-yes'));
    await flush();
    expect(JSON.parse(p.storage.getItem('casus:talk:de:done'))).toEqual(['A1-01']);
    await fireEvent.click(container.querySelector('.back'));
    await flush();
    expect(container.querySelector('.unit-row[data-unit="A1-01"]').classList.contains('done')).toBe(true);
  });
});

describe('character pitches', async () => {
  const { voicePitches, pitchOf } = await import('../../src/app/lib/talkvoices.js');
  const course = { voices: [{ id: 'n', role: 'narrator' }, { id: 'f', role: 'character', gender: 'f' }, { id: 'm', role: 'character', gender: 'm' },
    { id: 'm2', role: 'character', gender: 'm' }, { id: 'm3', role: 'character', gender: 'm', pitch: 1.12 }],
    protagonist: { f: 'f', m: 'm' }, cast: { jonas: { voice: 'm3' }, opa: { voice: 'm2' } } };
  it('every character voice gets its own pitch; a set pitch is kept', () => {
    const p = voicePitches(course);
    expect(p.f).toBe(1.25); expect(p.m).toBe(1); expect(p.m2).not.toBe(1); expect(p.m3).toBe(1.12);
    expect(new Set(Object.values(p)).size).toBe(4);
  });
  it('the protagonist speaks with the unit’s form; cast members with their voice', () => {
    expect(pitchOf(course, { protagonist: 'f' }, 'protagonist')).toBe(1.25);
    expect(pitchOf(course, { protagonist: 'm' }, 'jonas')).toBe(1.12);
    expect(pitchOf(course, {}, 'nobody')).toBe(1);
  });
});
