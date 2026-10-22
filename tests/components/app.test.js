// @vitest-environment jsdom
import { describe, it, expect, beforeAll } from 'vitest';
import { render, fireEvent } from '@testing-library/svelte';
import App from '../../src/app/App.svelte';

beforeAll(() => { Element.prototype.getAnimations ??= () => []; });

const files = {
  '/data/la/manifest.json': { format: 2, built: '2026-10-02', shards: { ro: {}, bo: {} } },
  '/data/la/forms/ro.json': { rosa: [[1, 'nnsf', 'nbsf']] },
  '/data/la/forms/bo.json': { bona: [[2, 'ngsf']] }, // genitive: agrees with nothing, so Rosa stays nom/abl
  '/data/la/lemmas.json': { 1: { headword: 'rosa', dict_form: 'rosa, -ae f.', pos: 'noun', decl: 1, gender: 'f', age: 'X', freq: 'A' }, 2: { headword: 'bona', dict_form: 'bona, -ae f.', pos: 'noun', decl: 1, gender: 'f', age: 'X', freq: 'A' } },
  '/data/la/glosses.en.json': { 1: 'rose', 2: 'good' },
  '/samples/la/index.json': [],
};
function fetchImpl(url) {
  const body = files[url];
  return Promise.resolve(body === undefined
    ? { ok: false, status: 404, json: async () => { throw new Error('404'); }, text: async () => '' }
    : { ok: true, status: 200, json: async () => structuredClone(body), text: async () => String(body) });
}
function storage(initial = {}) {
  const m = new Map(Object.entries(initial));
  return { getItem: (k) => m.get(k) ?? null, setItem: (k, v) => m.set(k, v), map: m };
}
const tick = () => new Promise((r) => setTimeout(r, 0));
const immediate = { schedule: (fn) => { fn(); return 1; }, cancel: () => {} };

async function readPasted(container, text) {
  await fireEvent.input(container.querySelector('textarea'), { target: { value: text } });
  await fireEvent.click(container.querySelector('button.read'));
  for (let i = 0; i < 5; i += 1) await tick();
}

describe('App', () => {
  it('reads a pasted sentence into blocks tied to the text pane and opens the dictionary', async () => {
    const { container } = render(App, { fetchImpl, storage: storage(), ...immediate });
    await tick(); await tick();
    await readPasted(container, 'Rosa bona.');
    expect(container.querySelectorAll('.pill')).toHaveLength(2);
    expect(container.querySelector('.sentence').textContent).toContain('Rosa');
    await fireEvent.click(container.querySelector('.pill'));
    await tick();
    expect(container.querySelector('.dictionary').textContent).toContain('rosa, -ae f.');
  });

  it('reads an arrangement saved before languages existed (casus:<hash>) into the Latin key', async () => {
    const s = storage();
    const first = render(App, { fetchImpl, storage: s, ...immediate });
    await tick(); await tick();
    await readPasted(first.container, 'Rosa bona.');
    await fireEvent.click(first.container.querySelector('.pill'));
    await tick();
    await fireEvent.click(first.container.querySelectorAll('button.pin')[1]);
    await tick();
    const [key, value] = [...s.map.entries()][0];
    const old = storage({ [key.replace('casus:la:', 'casus:')]: value });
    first.unmount();
    const second = render(App, { fetchImpl, storage: old, ...immediate });
    await tick(); await tick();
    await readPasted(second.container, 'Rosa bona.');
    expect(second.container.querySelector('.pill').classList.contains('pinned')).toBe(true);
  });

  it('autosaves and restores pins by the text hash', async () => {
    const s = storage();
    const first = render(App, { fetchImpl, storage: s, ...immediate });
    await tick(); await tick();
    await readPasted(first.container, 'Rosa bona.');
    await fireEvent.click(first.container.querySelector('.pill'));
    await tick();
    await fireEvent.click(first.container.querySelectorAll('button.pin')[1]);
    await tick();
    expect([...s.map.keys()][0]).toMatch(/^casus:la:[0-9a-f]{8}$/);
    first.unmount();

    const second = render(App, { fetchImpl, storage: s, ...immediate });
    await tick(); await tick();
    await readPasted(second.container, 'Rosa bona.');
    expect(second.container.querySelector('.pill').classList.contains('pinned')).toBe(true);
  });

  it('reports a missing lexicon instead of crashing', async () => {
    const { container } = render(App, { fetchImpl: async () => ({ ok: false, status: 404, json: async () => { throw new Error('404'); }, text: async () => '' }), storage: storage(), ...immediate });
    await tick(); await tick();
    expect(container.textContent).toMatch(/no lexicon/);
  });
});

describe('App, dictionary and unload', () => {
  it('closes the dictionary when another sentence is selected', async () => {
    const { container } = render(App, { fetchImpl, storage: storage(), ...immediate });
    await tick(); await tick();
    await readPasted(container, 'Rosa bona. Rosa.');
    await fireEvent.click(container.querySelector('.pill'));
    await tick();
    expect(container.querySelector('.dictionary')).not.toBe(null);
    await fireEvent.click(container.querySelectorAll('.sentence')[1]);
    await tick();
    expect(container.querySelector('.dictionary')).toBe(null);
  });

  it('closes the dictionary when the same block is clicked again (feedback D15)', async () => {
    const { container } = render(App, { fetchImpl, storage: storage(), ...immediate });
    await tick(); await tick();
    await readPasted(container, 'Rosa bona.');
    await fireEvent.click(container.querySelector('.pill'));
    await tick();
    expect(container.querySelector('.dictionary')).not.toBe(null);
    await fireEvent.click(container.querySelector('.pill'));
    await tick();
    expect(container.querySelector('.dictionary')).toBe(null);
  });

  it('closes the dictionary from its backdrop', async () => {
    const { container } = render(App, { fetchImpl, storage: storage(), ...immediate });
    await tick(); await tick();
    await readPasted(container, 'Rosa bona.');
    await fireEvent.click(container.querySelector('.pill'));
    await tick();
    await fireEvent.click(container.querySelector('.overlay'));
    await tick();
    expect(container.querySelector('.dictionary')).toBe(null);
  });

  it('flushes a pending autosave on pagehide', async () => {
    const s = storage();
    const never = { schedule: () => 42, cancel: () => {} };   // the debounce never fires
    const { container } = render(App, { fetchImpl, storage: s, ...never });
    await tick(); await tick();
    await readPasted(container, 'Rosa bona.');
    await fireEvent.click(container.querySelector('.pill'));
    await tick();
    await fireEvent.click(container.querySelectorAll('button.pin')[1]);
    await tick();
    expect(s.map.size).toBe(0);
    window.dispatchEvent(new Event('pagehide'));
    expect(s.map.size).toBe(1);
    expect(JSON.parse([...s.map.values()][0]).pins).toHaveLength(1);
  });
});

describe('App passage switching', () => {
  it('shows the passage chosen last even when an earlier load resolves later', async () => {
    let release;
    const slowOnce = { ...files };
    const fetchSlow = (url) => {
      if (url === '/data/la/forms/ro.json' && release === undefined) {
        return new Promise((resolve) => { release = () => resolve({ ok: true, status: 200, json: async () => structuredClone(files[url]) }); });
      }
      return fetchImpl(url);
    };
    const { container } = render(App, { fetchImpl: fetchSlow, storage: storage(), ...immediate });
    await tick(); await tick();
    await fireEvent.input(container.querySelector('textarea'), { target: { value: 'Rosa.' } });
    await fireEvent.click(container.querySelector('button.read'));      // stalls on the ro shard
    await tick();
    await fireEvent.input(container.querySelector('textarea'), { target: { value: 'Bona.' } });
    await fireEvent.click(container.querySelector('button.read'));      // resolves first
    for (let i = 0; i < 5; i += 1) await tick();
    expect(container.querySelector('.pill .surface').textContent).toBe('Bona');
    release();
    for (let i = 0; i < 5; i += 1) await tick();
    expect(container.querySelector('.pill .surface').textContent).toBe('Bona');
  });
});

describe('App page furniture (feedback D8, D14, D20)', () => {
  it('names its sections, explains the blocks, and has a help overlay listing every resource', async () => {
    const { container } = render(App, { fetchImpl, storage: storage(), ...immediate });
    await tick(); await tick();
    expect(container.querySelector('button.help-button')).not.toBe(null);
    await fireEvent.click(container.querySelector('button.help-button'));
    await tick();
    const help = container.querySelector('.help');
    expect(help.textContent).toMatch(/Whitaker/);
    expect(help.textContent).toMatch(/Wiktionary/);
    expect(help.textContent).toMatch(/Svelte/);
    expect(help.textContent).toMatch(/drag/i);
    await fireEvent.click(container.querySelector('.overlay'));
    await tick();
    expect(container.querySelector('.help')).toBe(null);
    await readPasted(container, 'Rosa bona.');
    const headings = [...container.querySelectorAll('h2')].map((h) => h.textContent);
    expect(headings.some((h) => /text/i.test(h))).toBe(true);
    expect(headings.some((h) => /sentence/i.test(h))).toBe(true);
    expect(headings.some((h) => /block/i.test(h))).toBe(true);
    expect(container.querySelector('.hint').textContent).toMatch(/click|drag/i);
    expect(container.querySelector('button.export-json').title).toMatch(/download/i);
    const legend = container.querySelector('details.legend-box');
    expect(legend.open).toBe(false);                                  // closed by default (Allan, 2026-10-18)
    await fireEvent.click(legend.querySelector('summary'));
    await tick();
    expect(container.querySelector('.legend')).not.toBe(null);
  });
});

describe('App UI language flag (decided 2026-10-18)', () => {
  it('switches the chrome to Brazilian Portuguese and the dictionary language with it, and remembers the choice', async () => {
    try { localStorage.removeItem('casus:ui-lang'); } catch {}
    const { container, unmount } = render(App, { fetchImpl, storage: storage(), ...immediate });
    await tick(); await tick();
    expect(container.querySelector('h2').textContent).toMatch(/Text/);
    await fireEvent.click(container.querySelector('button.ui-lang[data-lang=pt]'));
    await tick();
    expect(container.querySelector('h2').textContent).toMatch(/Texto/);
    expect(container.querySelector('button.read').textContent).toMatch(/Identificar a gramática/);
    await readPasted(container, 'Rosa bona.');
    expect(container.querySelector('select.gloss').value).toBe('pt');
    expect(container.querySelector('select.era option[value=classical]').textContent).toMatch(/Latim clássico/);
    unmount();
    const again = render(App, { fetchImpl, storage: storage(), ...immediate });
    await tick();
    expect(again.container.querySelector('h2').textContent).toMatch(/Texto/);
    await fireEvent.click(again.container.querySelector('button.ui-lang[data-lang=en]'));
    await tick();
    expect(again.container.querySelector('h2').textContent).toMatch(/Text/);
  });
});

describe('App activity log (copied from Desembarque, feedback E)', () => {
  it('writes a line for the dictionary, the reading, a pin and an export; the busy bar shows while a request is open', async () => {
    let release;
    const slow = (url) => (url === '/data/la/forms/bo.json' && !release)
      ? new Promise((r) => { release = () => r({ ok: true, status: 200, json: async () => structuredClone(files[url]) }); })
      : fetchImpl(url);
    const { container } = render(App, { fetchImpl: slow, storage: storage(), ...immediate });
    await tick(); await tick();
    const log = () => [...container.querySelectorAll('.activity .line')].map((l) => l.textContent);
    expect(log().some((l) => /dictionary loaded/.test(l))).toBe(true);
    await fireEvent.input(container.querySelector('textarea'), { target: { value: 'Rosa bona.' } });
    await fireEvent.click(container.querySelector('button.read'));
    await tick();
    expect(container.querySelector('.busy')).not.toBe(null);
    release();
    for (let i = 0; i < 6; i += 1) await tick();
    expect(container.querySelector('.busy')).toBe(null);
    expect(log().some((l) => /read: 2 words, 1 sentences/.test(l))).toBe(true);
    await fireEvent.click(container.querySelector('.pill'));
    await tick();
    await fireEvent.click(container.querySelectorAll('button.pin')[1]);
    await tick();
    expect(log().at(-1)).toMatch(/Rosa pinned as noun abl sg f/);
  });
});

describe('App language bar (languages design §4)', () => {
  it('lists the shipped languages with Latin current at the root', async () => {
    const { container } = render(App, { fetchImpl, storage: storage(), ...immediate });
    await tick(); await tick();
    const current = container.querySelector('nav.languages a[aria-current=page]');
    expect(current.textContent).toMatch(/Latin/);
    expect(current.getAttribute('href')).toBe('/');
  });
});

describe('App on the Greek page (languages plan Task 12)', () => {
  const grcFiles = {
    '/data/grc/manifest.json': { format: 2, built: '2026-10-18', lemmas: 3, key: 'strip', shards: { ο: {}, λο: {}, τω: {}, παι: {} } },
    '/data/grc/forms/ο.json': { 'ὁ': [[1, 'tnsm']] },
    '/data/grc/forms/λο.json': { 'λόγου': [[2, 'ngsm']], 'λόγοσ': [[2, 'nnsm']] },
    '/data/grc/forms/τω.json': { 'τώ': [[1, 'tndm', 'tadm']] },
    '/data/grc/forms/παι.json': { 'παῖδε': [[3, 'nndm', 'nadm', 'nvdm']] },
    '/data/grc/lemmas.json': { 1: { headword: 'ὁ', pos: 'det' }, 2: { headword: 'λόγος', dict_form: 'λόγος, λόγου m.', pos: 'noun', gender: 'm', decl: '2' }, 3: { headword: 'παῖς', pos: 'noun', gender: 'c' } },
    '/data/grc/glosses.en.json': { 2: 'word, speech', 3: 'child' },
    '/samples/grc/index.json': [],
  };
  const grcFetch = (url) => {
    const body = grcFiles[url];
    return Promise.resolve(body === undefined
      ? { ok: false, status: 404, json: async () => { throw new Error('404'); }, text: async () => '' }
      : { ok: true, status: 200, json: async () => structuredClone(body), text: async () => String(body) });
  };
  it('marks Greek in the bar, offers the Greek periods, colours a genitive with the Greek palette and a dual with a double border', async () => {
    window.history.pushState({}, '', '/grc/');
    try {
      const { container } = render(App, { fetchImpl: grcFetch, storage: storage(), ...immediate });
      await tick(); await tick();
      expect(container.querySelector('nav.languages a[aria-current=page]').textContent).toMatch(/Ancient Greek/);
      expect(container.querySelector('.tagline').textContent).toMatch(/Ancient Greek/);
      expect(container.querySelector('.tagline').textContent).not.toMatch(/Latin/);
      expect(container.querySelector('.paste-label').textContent).toMatch(/Ancient Greek/);
      await readPasted(container, 'λόγου τὼ παῖδε.');
      expect(container.querySelector('select.era option[value=koine]')).not.toBe(null);
      const pills = [...container.querySelectorAll('.pill')];
      const logou = pills.find((p) => p.textContent.includes('λόγου'));
      expect(logou.querySelector('.badge').textContent).toBe('Gn');
      expect(logou.style.borderColor).not.toBe('');
      const paide = pills.find((p) => p.textContent.includes('παῖδε'));
      expect(paide.classList.contains('ambiguous')).toBe(true);
      await fireEvent.click(logou);
      await tick();
      expect(container.querySelector('button.dict-tab').textContent).toMatch(/Wiktionary/);
      await fireEvent.keyDown(container.querySelector('.dictionary'), { key: 'Escape' });
      const tw = pills.find((p) => p.textContent.includes('τὼ'));
      expect(tw.style.borderStyle === 'double' || tw.classList.contains('ambiguous')).toBe(true);
    } finally { window.history.pushState({}, '', '/'); }
  });
});

describe('App header on a phone (Allan, 2026-10-22: the whole first screen was flags)', () => {
  it('line one is the three sites; everything else that was a button sits behind a gear, the XP chip stays out', async () => {
    const { container } = render(App, { fetchImpl, storage: storage(), ...immediate });
    await tick(); await tick();
    const gear = container.querySelector('details.settings');
    expect(gear).not.toBe(null);
    expect(gear.open).toBe(false);
    expect(gear.querySelector('summary').getAttribute('aria-label')).toMatch(/settings/i);
    for (const sel of ['nav.languages', 'button.ui-lang', 'button.help-button', 'a.report-button']) expect(gear.querySelector(sel)).not.toBe(null);
    for (const sel of ['nav.sites', '.xp-chip', 'nav.views']) {
      expect(container.querySelector(sel)).not.toBe(null);
      expect(gear.querySelector(sel)).toBe(null);
    }
    // no separate language chip: the gear button says target → interface (Allan, 2026-10-22)
    expect(container.querySelector('.current-lang')).toBe(null);
    const pair = gear.querySelector('summary .lang-pair');
    expect(pair.getAttribute('title')).toMatch(/Latin.*English/);
    expect(pair.textContent).toMatch(/→\s*EN/);
  });
  it('inside the gear: the language to learn, an arrow, then the language you learn in', async () => {
    const { container } = render(App, { fetchImpl, storage: storage(), ...immediate });
    await tick(); await tick();
    const gear = container.querySelector('details.settings');
    const parts = [...gear.querySelectorAll('.learn-target, .lang-arrow, .learn-in')].map((e) => e.className.split(' ')[0]);
    expect(parts).toEqual(['learn-target', 'lang-arrow', 'learn-in']);
    expect(gear.querySelector('.learn-target').textContent).toMatch(/language to learn/i);
    expect(gear.querySelector('.learn-in').textContent).toMatch(/learning in/i);
    expect(gear.querySelector('.learn-target nav.languages')).not.toBe(null);
    expect(gear.querySelector('.learn-in button.ui-lang')).not.toBe(null);
  });
});
