// @vitest-environment jsdom
import { describe, it, expect, afterEach } from 'vitest';
import { render, fireEvent } from '@testing-library/svelte';
import { tick } from 'svelte';
import Talk from '../../src/app/components/Talk.svelte';
import { getLanguage } from '../../src/lang/registry.js';
import { langFromPath, talkPath } from '../../src/app/lib/route.js';
import { setLang } from '../../src/app/lib/i18n.svelte.js';

const flush = async () => { for (let i = 0; i < 10; i += 1) { await tick(); await new Promise((r) => setTimeout(r, 0)); } };
const store = () => { const m = new Map(); return { getItem: (k) => m.get(k) ?? null, setItem: (k, v) => m.set(k, String(v)), m }; };
const COURSE = {
  language: 'de', example: true, narrator_languages: ['pt', 'en'],
  cast: { becker: { name: 'Frau Becker' }, protagonist: { name: null } },
  units: [
    { id: 'A1-01', level: 'A1', number: 1, title: { pt: 'A senhoria', en: 'The landlady' }, situation: { pt: 'Você chegou.', en: 'You arrived.' },
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
    expect(rows[0].textContent).toContain('A senhoria');
    await fireEvent.click(rows[0]);
    await flush();
    expect(container.querySelector('.unit-page h3').textContent).toContain('A senhoria');
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

  it('a prompt asks first; the answer appears and plays only on request; a typed answer is checked', async () => {
    setLang('en');
    const { p, spoken } = props();
    const { container } = render(Talk, p);
    await flush();
    await fireEvent.click(container.querySelector('.unit-row'));
    await flush();
    const prompt = container.querySelector('.step[data-type="prompt"]');
    expect(prompt.querySelector('.ask').textContent).toBe('Thank her.');
    expect(prompt.querySelector('.taught')).toBeNull();
    const input = prompt.querySelector('input.typed');
    await fireEvent.input(input, { target: { value: 'danke' } });
    await fireEvent.click(prompt.querySelector('.check'));
    expect(prompt.querySelector('.verdict').dataset.ok).toBe('true');
    await fireEvent.input(input, { target: { value: 'bitte' } });
    await fireEvent.click(prompt.querySelector('.check'));
    expect(prompt.querySelector('.verdict').dataset.ok).toBe('false');
    await fireEvent.click(prompt.querySelector('.answer'));
    await flush();
    expect(prompt.querySelector('.taught').textContent).toBe('Danke!');
    expect(spoken.at(-1)).toEqual(['de', 'Danke!']);
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
