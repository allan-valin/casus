// @vitest-environment jsdom
import { describe, it, expect, beforeAll } from 'vitest';
import { render, fireEvent } from '@testing-library/svelte';
import App from '../../src/app/App.svelte';

beforeAll(() => { Element.prototype.getAnimations ??= () => []; });

const files = {
  '/data/manifest.json': { format: 2, built: '2026-10-02', shards: { ro: {}, bo: {} } },
  '/data/forms/ro.json': { rosa: [[1, 'nnsf', 'nbsf']] },
  '/data/forms/bo.json': { bona: [[2, 'ngsf']] }, // genitive: agrees with nothing, so Rosa stays nom/abl
  '/data/lemmas.json': { 1: { headword: 'rosa', dict_form: 'rosa, -ae f.', pos: 'noun', decl: 1, gender: 'f', age: 'X', freq: 'A' }, 2: { headword: 'bona', dict_form: 'bona, -ae f.', pos: 'noun', decl: 1, gender: 'f', age: 'X', freq: 'A' } },
  '/data/glosses.en.json': { 1: 'rose', 2: 'good' },
  '/samples/index.json': [],
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

  it('autosaves and restores pins by the text hash', async () => {
    const s = storage();
    const first = render(App, { fetchImpl, storage: s, ...immediate });
    await tick(); await tick();
    await readPasted(first.container, 'Rosa bona.');
    await fireEvent.click(first.container.querySelector('.pill'));
    await tick();
    await fireEvent.click(first.container.querySelectorAll('button.pin')[1]);
    await tick();
    expect([...s.map.keys()][0]).toMatch(/^casus:[0-9a-f]{8}$/);
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
