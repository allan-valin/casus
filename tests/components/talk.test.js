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

  it('a Japanese unit links its new kanji, and the kanji of its reviews, to the kanji drills in Learn (Allan, 2026-10-22)', async () => {
    setLang('pt');
    const unit = { ...COURSE.units[0], kanji: [{ k: '桜', lesson: 'n3-k9' }, { k: '噌', lesson: null }], review_kanji: [{ k: '日', lesson: 'n5-k1' }],
      steps: [...COURSE.units[0].steps.slice(0, 5), { type: 'prompt', review: true, ask: { pt: 'Diga.', en: 'Say.' }, answer: { speaker: 'protagonist', text: 'Danke!' }, items: ['danke'] }, ...COURSE.units[0].steps.slice(5)] };
    const { p } = props({ loadTalk: async () => ({ ...COURSE, units: [unit] }), kanjiHref: (lesson) => `/ja/learn/#${lesson}` });
    const { container } = render(Talk, p);
    await flush();
    await fireEvent.click(container.querySelector('.unit-row'));
    await flush();
    const card = container.querySelector('.unit-kanji');
    expect([...card.querySelectorAll('a.kanji')].map((a) => [a.textContent, a.getAttribute('href')])).toEqual([['桜', '/ja/learn/#n3-k9']]);
    expect(card.querySelector('span.kanji').textContent).toBe('噌');        // no lesson drills it: shown, not linked
    const review = container.querySelector('.step[data-type="prompt"] .review-kanji');
    expect(review.querySelector('a.kanji').getAttribute('href')).toBe('/ja/learn/#n5-k1');
    expect(container.querySelectorAll('.review-kanji')).toHaveLength(1);    // once, at the first review question
  });
  it('Japanese: the line is spoken from its kana, with the course sounds (pitch accent) and the character speaker for the natural voice (Allan 2026-10-22)', async () => {
    const spokenOpts = [];
    const ja = { ...COURSE, language: 'ja', voices: [{ id: 'jf', tts: 'piper:ja_JP-hi_fi_captain-medium#female' }], cast: { becker: { name: 'X', voice: 'jf' }, protagonist: { name: null } },
      readings: { 'Guten Tag.': { rt: [['Guten Tag.', 'ぐーてん']], say: 'ぐーてん', ph: 'ɡɯ↑ɯteɴ.' } } };
    const { p } = props({ loadTalk: async () => ja, speakTaught: async (text, o) => { spokenOpts.push([text, o]); } });
    const { container } = render(Talk, p);
    await flush();
    await fireEvent.click(container.querySelector('.unit-row'));
    await flush();
    await fireEvent.click(container.querySelector('.step[data-type="dialogue"] .play'));
    await flush();
    expect(spokenOpts[0][0]).toBe('ぐーてん');
    expect(spokenOpts[0][1]).toMatchObject({ phonemes: 'ɡɯ↑ɯteɴ.', speaker: 'female' });
  });
  it('an audience version shows its slot number, not the internal suffix (A1-02-e → A1-02)', async () => {
    setLang('en');
    const course = { ...COURSE, narrator_languages: ['en', 'ar'], units: [{ ...COURSE.units[1], id: 'A1-02-e', tracks: ['en'] }] };
    const { p } = props({ loadTalk: async () => course });
    const { container } = render(Talk, p);
    await flush();
    expect(container.querySelector('.unit-row .u-id').textContent).toBe('A1-02');
    expect(container.querySelector('.unit-row').dataset.unit).toBe('A1-02-e');
    await fireEvent.click(container.querySelector('.unit-row'));
    await flush();
    expect(container.querySelector('.unit-page h3').textContent).toMatch(/^A1-02 ·/);
  });

  it('levels are tabs: opens on the first unfinished level, switches without reloading, remembers the choice (Allan, 2026-10-22)', async () => {
    setLang('pt');
    const lvl = (id, level, number) => ({ id, level, number, title: { pt: id, en: id }, situation: { pt: '', en: '' }, new_items: [], steps: [] });
    const course = { ...COURSE, units: [lvl('A1-01', 'A1', 1), lvl('A1-02', 'A1', 2), lvl('A2-01', 'A2', 1), lvl('A2-02', 'A2', 2)] };
    let loads = 0;
    const storage = store();
    storage.setItem('casus:talk:de:done', JSON.stringify(['A1-01', 'A1-02']));
    const { p } = props({ loadTalk: async () => { loads += 1; return course; }, storage });
    const { container, unmount } = render(Talk, p);
    await flush();
    const tabs = () => [...container.querySelectorAll('.level-tab')];
    expect(tabs().map((b) => b.dataset.level)).toEqual(['A1', 'A2']);
    expect(tabs()[0].textContent).toContain('2/2');
    const rows = () => [...container.querySelectorAll('.unit-row')].map((r) => r.dataset.unit);
    expect(rows()).toEqual(['A2-01', 'A2-02']);                 // A1 finished: opens where you left off
    await fireEvent.click(tabs()[0]);
    await flush();
    expect(rows()).toEqual(['A1-01', 'A1-02']);
    expect(tabs()[0].getAttribute('aria-selected')).toBe('true');
    expect(loads).toBe(1);
    await fireEvent.click(container.querySelector('.unit-row'));
    await flush();
    await fireEvent.click(container.querySelector('.back'));
    await flush();
    expect(rows()).toEqual(['A1-01', 'A1-02']);                 // back from a unit keeps the tab
    unmount();
    const again = render(Talk, props({ loadTalk: async () => course, storage }).p);
    await flush();
    expect([...again.container.querySelectorAll('.unit-row')].map((r) => r.dataset.unit)).toEqual(['A1-01', 'A1-02']);
  });

  it('the levels sit under one button showing the current level and its progress (Allan, 2026-10-22)', async () => {
    const lvl = (id, level, number) => ({ id, level, number, title: { pt: id, en: id }, situation: { pt: '', en: '' }, new_items: [], steps: [] });
    const course = { ...COURSE, units: [lvl('A1-01', 'A1', 1), lvl('A1-02', 'A1', 2), lvl('A2-01', 'A2', 1)] };
    const storage = store();
    storage.setItem('casus:talk:de:done', JSON.stringify(['A1-01']));
    const { container } = render(Talk, props({ loadTalk: async () => course, storage }).p);
    await flush();
    const picker = container.querySelector('details.picker.level-picker');
    expect(picker).not.toBe(null);
    expect(picker.querySelector('summary').textContent).toMatch(/A1.*1\/2/);
    picker.open = true;
    await fireEvent.click(picker.querySelector('.level-tab[data-level="A2"]'));
    await flush();
    expect(picker.open).toBe(false);
    expect(picker.querySelector('summary').textContent).toMatch(/A2.*0\/1/);
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
    await fireEvent.click(container.querySelector('.player-bar .playpause'));
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

  it('an apostrophe in “don\u2019t” is not a quote, and unquoted Cyrillic still goes to the taught voice (Allan 2026-10-22: English read the Macedonian)', async () => {
    setLang('en');
    const spoken = [];
    const course = { ...COURSE, language: 'mk', units: [{ ...COURSE.units[0], steps: [
      { type: 'narrator', text: { en: "To greet someone you don't know, say 'Добар ден'. Listen." } },
      { type: 'narrator', text: { en: "Words in -о take -то: око → окото. It's easy." } }, { type: 'selfcheck' }] }] };
    const { p } = props({ lang: { ...getLanguage('mk') }, loadTalk: async () => course, speakTaught: async (t) => { spoken.push(['taught', t]); }, speakNarrator: async (t) => { spoken.push(['narrator', t]); } });
    const { container } = render(Talk, p);
    await flush();
    await fireEvent.click(container.querySelector('.unit-row'));
    await flush();
    const plays = container.querySelectorAll('.step[data-type="narrator"] .play');
    await fireEvent.click(plays[0]);
    await flush();
    expect(spoken).toEqual([['narrator', "To greet someone you don't know, say"], ['taught', 'Добар ден'], ['narrator', 'Listen.']]);
    spoken.length = 0;
    await fireEvent.click(plays[1]);
    await flush();
    for (const [who, text] of spoken) if (who === 'narrator') expect(text).not.toMatch(/\p{Script=Cyrillic}/u);
    expect(spoken.filter(([w]) => w === 'taught').map(([, t]) => t)).toEqual(['о', 'то', 'око', 'окото']);
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
    await fireEvent.click(container.querySelector('.player-bar .playpause'));   // start
    await flush();
    await fireEvent.click(container.querySelector('.player-bar .playpause'));   // pause during the first step
    hold();                                                                      // its sentence ends anyway
    for (let i = 0; i < 10; i += 1) await flush();
    expect(spoken).toEqual(['Listen.']);                                         // nothing new while paused
    await fireEvent.click(container.querySelector('.player-bar .playpause'));   // resume
    for (let i = 0; i < 100 && spoken.length < 2; i += 1) await new Promise((r) => setTimeout(r, 20));   // the run checks every 120 ms
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
    await fireEvent.click(container.querySelector('.player-bar .playpause'));
    for (let i = 0; i < 400 && !container.querySelector('.step.current[data-type="selfcheck"]'); i += 1) await new Promise((r) => setTimeout(r, 5));
    for (let i = 0; i < 20; i += 1) await new Promise((r) => setTimeout(r, 5));
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
    await fireEvent.click(container.querySelector('.player-bar .playpause'));
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

  it('dialogue lines go to the voice with the character pitch and speed', async () => {
    const asked = [];
    const course = { ...COURSE, voices: [{ id: 'f2', role: 'character', gender: 'f', pitch: 1.12, speed: 1.12 }, { id: 'p', role: 'character', gender: 'f', pitch: 1.32 }],
      protagonist: { f: 'p', m: 'p' }, cast: { becker: { name: 'Frau Becker', voice: 'f2' } }, units: COURSE.units.map((u) => ({ ...u, protagonist: 'f' })) };
    const { p } = props({ loadTalk: async () => course, speakTaught: async (t, o) => { asked.push([t, o]); } });
    const { container } = render(Talk, p);
    await flush();
    await fireEvent.click(container.querySelector('.unit-row'));
    await flush();
    await fireEvent.click(container.querySelector('.step[data-type="dialogue"] .play'));
    for (let i = 0; i < 5; i += 1) await flush();
    expect(asked[0]).toEqual(['Guten Tag.', { pitch: 1.12, speed: 1.12 }]);
    expect(asked[1][1]).toEqual({ pitch: 1.32, speed: 1 });
  });

  it('hands-free is a mode switch: on during a step lets it finish, then the next plays; off lets it finish and nothing follows (Allan 2026-10-21)', async () => {
    const spoken = [];
    const holds = [];
    const speakNarrator = (t) => { spoken.push(t); return new Promise((r) => { holds.push(r); }); };
    const speakTaught = (t) => { spoken.push(t); return new Promise((r) => { holds.push(r); }); };
    const calls = [];
    const { p } = props({ speakNarrator, speakTaught, control: { pause: () => calls.push('pause'), resume: () => {}, stop: () => calls.push('stop') } });
    const { container } = render(Talk, p);
    await flush();
    await fireEvent.click(container.querySelector('.unit-row'));
    await flush();
    await fireEvent.click(container.querySelector('.step[data-type="narrator"] .play'));   // step 1 plays
    await flush();
    calls.length = 0;
    await fireEvent.click(container.querySelector('.hands-free'));                          // mode on
    await flush();
    expect(calls).toEqual([]);                                                               // nothing interrupted or restarted
    expect(spoken).toEqual(['Listen.']);
    holds.shift()();                                                                         // step 1 ends by itself
    for (let i = 0; i < 100 && spoken.length < 2; i += 1) await new Promise((r) => setTimeout(r, 10));
    expect(spoken[1]).toBe('Guten Tag.');                                                   // the next step followed
    await fireEvent.click(container.querySelector('.hands-free'));                          // mode off during step 2
    expect(calls).toEqual([]);
    for (let i = 0; i < 6; i += 1) { holds.shift()?.(); for (let j = 0; j < 10; j += 1) await new Promise((r) => setTimeout(r, 5)); }
    expect(spoken).toEqual(['Listen.', 'Guten Tag.', 'Danke!']);                           // step 2 finished; step 3 never started
  });

  it('turning hands-free on with nothing playing starts nothing; the next ▶ starts the chain', async () => {
    const spoken = [];
    const { p } = props({ speakNarrator: async (t) => { spoken.push(t); }, speakTaught: async (t) => { spoken.push(t); }, pause: () => Promise.resolve() });
    const { container } = render(Talk, p);
    await flush();
    await fireEvent.click(container.querySelector('.unit-row'));
    await flush();
    await fireEvent.click(container.querySelector('.hands-free'));
    for (let i = 0; i < 5; i += 1) await flush();
    expect(spoken).toEqual([]);
    expect(container.querySelector('.hands-free').classList.contains('on')).toBe(true);
    await fireEvent.click(container.querySelector('.step[data-type="line"] .play'));
    for (let i = 0; i < 30; i += 1) await flush();
    expect(spoken.slice(0, 2)).toEqual(['Danke', '-gung']);
  });

  it('with hands-free on, ⏭ and ⏮ play the step they land on once, and the run goes on from there (Allan 2026-10-21 bug)', async () => {
    const spoken = [];
    const holds = [];
    const speakNarrator = (t) => { spoken.push(t); return new Promise((r) => { holds.push(r); }); };
    const speakTaught = (t) => { spoken.push(t); return new Promise((r) => { holds.push(r); }); };
    const { p } = props({ speakNarrator, speakTaught, pause: () => Promise.resolve(), control: { pause: () => {}, resume: () => {}, stop: () => { while (holds.length) holds.shift()(); } } });
    const { container } = render(Talk, p);
    await flush();
    await fireEvent.click(container.querySelector('.unit-row'));
    await flush();
    await fireEvent.click(container.querySelector('.hands-free'));
    const bar = container.querySelector('.player-bar');
    await fireEvent.click(bar.querySelector('.next'));        // → step 1, held
    await flush();
    await fireEvent.click(bar.querySelector('.next'));        // → step 2 (stops step 1)
    for (let i = 0; i < 10; i += 1) await flush();
    await fireEvent.click(bar.querySelector('.prev'));        // → back to step 1
    for (let i = 0; i < 10; i += 1) await flush();
    expect(spoken).toEqual(['Listen.', 'Guten Tag.', 'Listen.']);
    expect(container.querySelector('.step.current .num').textContent).toBe('1');
    holds.shift()();                                          // step 1 ends by itself → step 2 follows, once
    for (let i = 0; i < 20; i += 1) await flush();
    expect(spoken).toEqual(['Listen.', 'Guten Tag.', 'Listen.', 'Guten Tag.']);
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
  it('many voices: a set pitch is kept exactly and the spreading always ends (Allan, 2026-10-22: B1-20 sounded like one voice)', async () => {
    const { readFileSync } = await import('node:fs');
    const mk = JSON.parse(readFileSync('public/talk/mk.json', 'utf8'));
    const p = voicePitches(mk);
    expect(p['mk-s-f']).toBe(1.18);
    expect(p['mk-p-m']).toBe(1);
    expect(pitchOf(mk, { protagonist: 'm' }, 'sara')).not.toBe(pitchOf(mk, { protagonist: 'm' }, 'protagonist'));
    const crowd = { voices: Array.from({ length: 40 }, (_, i) => ({ id: `v${i}`, role: 'character', gender: i % 2 ? 'f' : 'm' })) };
    const q = voicePitches(crowd);
    expect(Object.keys(q).length).toBe(40);
    for (const x of Object.values(q)) expect(x).toBeGreaterThan(0.5);
  });

  it('in every dialogue of every course, two speakers never sound alike (pitch 0.06 or speed 0.08 apart)', async () => {
    const { readFileSync, readdirSync } = await import('node:fs');
    const { speedOf } = await import('../../src/app/lib/talkvoices.js');
    const clashes = [];
    for (const f of readdirSync('public/talk').filter((x) => x.endsWith('.json'))) {
      const c = JSON.parse(readFileSync(`public/talk/${f}`, 'utf8'));
      const pitches = voicePitches(c);
      for (const u of c.units ?? []) {
        for (const st of u.steps ?? []) {
          const who = [...new Set((st.lines ?? []).map((l) => l.speaker))];
          for (let i = 0; i < who.length; i += 1) for (let j = i + 1; j < who.length; j += 1) {
            const [a, b] = [who[i], who[j]];
            const dp = Math.abs(pitchOf(c, u, a, pitches) - pitchOf(c, u, b, pitches));
            const ds = Math.abs(speedOf(c, u, a) - speedOf(c, u, b));
            if (dp < 0.06 && ds < 0.08) clashes.push(`${f} ${u.id}: ${a}/${b}`);
          }
        }
      }
    }
    expect(clashes).toEqual([]);
  });

  it('a voice may speak slower: speedOf gives the voice speed (older characters; Allan 2026-10-21)', async () => {
    const { speedOf } = await import('../../src/app/lib/talkvoices.js');
    const c = { ...course, voices: [...course.voices, { id: 'old', role: 'character', gender: 'f', pitch: 1.12, speed: 1.12 }], cast: { ...course.cast, vera: { voice: 'old' } } };
    expect(speedOf(c, {}, 'vera')).toBe(1.12);
    expect(speedOf(c, { protagonist: 'f' }, 'protagonist')).toBe(1);
  });
  it('a two-speaker voice: speakerOf names the speaker from the voice (piper:…#female / #male); others get none', async () => {
    const { speakerOf } = await import('../../src/app/lib/talkvoices.js');
    const c = { ...course, voices: [...course.voices, { id: 'jf', tts: 'piper:ja_JP-hi_fi_captain-medium#female' }, { id: 'jm', tts: 'piper:ja_JP-hi_fi_captain-medium#male' }],
      cast: { ...course.cast, suzuki: { voice: 'jf' } }, protagonist: { f: 'jf', m: 'jm' } };
    expect(speakerOf(c, {}, 'suzuki')).toBe('female');
    expect(speakerOf(c, { protagonist: 'm' }, 'protagonist')).toBe('male');
    expect(speakerOf(course, { protagonist: 'f' }, 'protagonist')).toBeNull();
  });
  it('the protagonist speaks with the unit’s form; cast members with their voice', () => {
    expect(pitchOf(course, { protagonist: 'f' }, 'protagonist')).toBe(1.25);
    expect(pitchOf(course, { protagonist: 'm' }, 'jonas')).toBe(1.12);
    expect(pitchOf(course, {}, 'nobody')).toBe(1);
  });
});

describe('narration split over the real courses', () => {
  it('no narrator part of any course still contains another alphabet', async () => {
    const { readFileSync, readdirSync } = await import('node:fs');
    const { narrationParts, taughtLetters } = await import('../../src/app/lib/narration.js');
    const bad = [];
    for (const f of readdirSync('public/talk').filter((x) => x.endsWith('.json'))) {
      const c = JSON.parse(readFileSync(`public/talk/${f}`, 'utf8'));
      const letters = taughtLetters(c.language, c.units.flatMap((u) => u.steps ?? []).find((x) => x.lines?.length)?.lines[0].text);
      for (const u of c.units ?? []) for (const st of u.steps ?? []) {
        if (st.type !== 'narrator') continue;
        for (const [l, text] of Object.entries(st.text ?? {})) {
          if (['ar', 'mk'].includes(l)) {   // a non-Latin narrator of a Latin-script course keeps its own voice
            if (!letters) expect(narrationParts(text, letters).every((x) => !x.taught || /«/.test(text))).toBe(true);
            continue;
          }
          for (const part of narrationParts(text, letters)) if (!part.taught && /[^\p{Script=Latin}\P{L}]/u.test(part.text)) bad.push(`${f} ${u.id} ${l}: ${part.text}`);
        }
      }
    }
    expect(bad.slice(0, 10)).toEqual([]);
  });
});

describe('narration in a non-Latin narrator language', () => {
  it('a German course narrated in Arabic or Macedonian keeps the narration in the narrator voice', async () => {
    const { narrationParts, taughtLetters } = await import('../../src/app/lib/narration.js');
    const letters = taughtLetters('de', 'Guten Tag, Frau Becker.');
    expect(letters).toBeNull();
    expect(narrationParts('За поздрав кажете «Guten Tag». Слушајте.', letters)).toEqual([
      { text: 'За поздрав кажете', taught: false }, { text: 'Guten Tag', taught: true }, { text: 'Слушајте.', taught: false }]);
  });
});

describe('Japanese: furigana over kanji, romaji below, the voice reads kana (Allan, 2026-10-22)', () => {
  const JA = {
    language: 'ja', example: false, narrator_languages: ['pt', 'en'],
    cast: { kenta: { name: 'Kenta' }, protagonist: { name: null } },
    readings: {
      '私は学生です。': { rt: [['私', 'わたし'], ['は', 'は'], ['学生', 'がくせい'], ['です', 'です'], ['。', '。']], say: 'わたしはがくせいです。' },
      '学生': { rt: [['学生', 'がくせい']], say: 'がくせい' },
    },
    units: [{ id: 'A1-01', level: 'A1', number: 1, title: { pt: 'Oi', en: 'Hi' }, situation: { pt: '.', en: '.' },
      new_items: [{ id: 'gakusei', text: '学生', meaning: { pt: 'estudante', en: 'student' } }],
      steps: [
        { type: 'narrator', text: { pt: 'Diga «学生».', en: 'Say «学生».' } },
        { type: 'dialogue', lines: [{ speaker: 'kenta', text: '私は学生です。', meaning: { pt: 'Eu sou estudante.', en: 'I am a student.' } }] },
      ] }],
  };
  it('shows ruby and romaji with the particle read as wa, and speaks the kana', async () => {
    setLang('pt');
    const { p, spoken } = props({ lang: getLanguage('ja'), loadTalk: async () => JA });
    const { container } = render(Talk, p);
    await flush();
    await fireEvent.click(container.querySelector('.unit-row'));
    await flush();
    const step = container.querySelector('.step[data-type="dialogue"]');
    await fireEvent.click(step.querySelector('.reveal'));
    await flush();
    expect([...step.querySelectorAll('.taught rt')].map((r) => r.textContent)).toEqual(['わたし', 'がくせい']);
    expect(step.querySelector('.roman').textContent).toBe('watashi wa gakusei desu.');
    await fireEvent.click(container.querySelector('.step[data-type="narrator"] .play')); await flush();
    await fireEvent.click(step.querySelector('.play')); await flush();
    expect(spoken).toContainEqual(['de', 'がくせい']);            // the taught word inside the narration
    expect(spoken).toContainEqual(['de', 'わたしはがくせいです。']);
  });

});

describe('Unit list: lesson tags, search in every level, in-development banner', () => {
  // Allan, 2026-10-27: each unit shows what it covers, on the list itself; a search looks in every level; a course
  // under revision says so and points to the Report-a-problem button
  const LEARN = { levels: [{ id: 'A1', topics: [{ kind: 'grammar', lessons: [{ id: 'de-sein', title: 'sein', meaning: { en: 'the verb to be', pt: 'o verbo ser' } }] }] }] };
  const TAGGED = { ...COURSE, example: false, units: [
    { ...COURSE.units[0], learn_lessons: ['de-sein', 'de-nowhere'] },
    { ...COURSE.units[1], learn_lessons: [] },
    { ...COURSE.units[1], id: 'B1-01', level: 'B1', title: { pt: 'Domingo de chuva', en: 'Rainy Sunday' } },
  ] };

  it('the unit list tags each unit with the Learn lessons it practises; unknown ids are left out (Allan, 2026-10-27)', async () => {
    setLang('pt');
    const { p } = props({ loadTalk: async () => TAGGED, loadLearn: async () => LEARN, lessonHref: (id) => `/de/learn/#${id}` });
    const { container } = render(Talk, p);
    await flush();
    const tags = [...container.querySelectorAll('.unit-row[data-unit="A1-01"] .u-tag')];
    expect(tags.map((x) => x.textContent.trim())).toEqual(['sein']);
    expect(tags[0].getAttribute('title')).toBe('o verbo ser');
    expect(container.querySelectorAll('.unit-row[data-unit="A1-02"] .u-tag').length).toBe(0);
    await fireEvent.click(container.querySelector('.unit-row[data-unit="A1-01"]')); await flush();
    const link = container.querySelector('.unit-page a.learn-tag');
    expect(link.getAttribute('href')).toBe('/de/learn/#de-sein');
  });

  it('a search looks in every level: title, situation and lesson tags, matches under their level (Allan, 2026-10-27)', async () => {
    setLang('pt');
    const { p } = props({ loadTalk: async () => TAGGED, loadLearn: async () => LEARN });
    const { container } = render(Talk, p);
    await flush();
    const box = container.querySelector('input.talk-search');
    await fireEvent.input(box, { target: { value: 'domingo' } }); await flush();
    expect([...container.querySelectorAll('.unit-row')].map((r) => r.dataset.unit)).toEqual(['A1-02', 'B1-01']);
    expect([...container.querySelectorAll('.level-head')].map((h) => h.dataset.level)).toEqual(['A1', 'B1']);
    await fireEvent.input(box, { target: { value: 'verbo ser' } }); await flush();
    expect([...container.querySelectorAll('.unit-row')].map((r) => r.dataset.unit)).toEqual(['A1-01']);
    await fireEvent.input(box, { target: { value: '' } }); await flush();
    expect(container.querySelectorAll('.level-head').length).toBe(0);
  });

  it('a course under revision shows an in-development banner pointing to Report a problem (Allan, 2026-10-27)', async () => {
    setLang('pt');
    const { p } = props({ loadTalk: async () => TAGGED, inDevelopment: true });
    const { container } = render(Talk, p);
    await flush();
    const b = container.querySelector('.in-dev');
    expect(b).not.toBeNull();
    expect(b.textContent).toContain('Relatar um problema');
    const { p: p2 } = props({ loadTalk: async () => TAGGED });
    const r2 = render(Talk, p2); await flush();
    expect(r2.container.querySelector('.in-dev')).toBeNull();
  });
});
