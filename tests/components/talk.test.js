// @vitest-environment jsdom
import { describe, it, expect, afterEach } from 'vitest';
import { render, fireEvent } from '@testing-library/svelte';
import { tick } from 'svelte';
import Talk from '../../src/app/components/Talk.svelte';
import PracticeStub from '../fixtures/PracticeStub.svelte';
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
