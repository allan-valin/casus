// @vitest-environment jsdom
import { describe, it, expect } from 'vitest';
import { render, fireEvent } from '@testing-library/svelte';
import { tick } from 'svelte';
import Proofread from '../../src/app/components/Proofread.svelte';
import { getLanguage } from '../../src/lang/registry.js';
import { langFromPath, proofPath } from '../../src/app/lib/route.js';
import { SITES, siteLanguages } from '../../src/sites.js';

const flush = async () => { for (let i = 0; i < 10; i += 1) { await tick(); await new Promise((r) => setTimeout(r, 0)); } };
const store = () => { const m = new Map(); return { getItem: (k) => m.get(k) ?? null, setItem: (k, v) => m.set(k, String(v)), m }; };
const speller = { correct: (w) => w !== 'nao', suggest: () => ['não'] };
const grammar = async (text) => {
  const at = text.indexOf('as casa ');
  const comma = text.indexOf(' ,');
  return { engine: 'public', issues: [
    ...(at >= 0 ? [{ kind: 'grammar', offset: at, length: 7, message: 'Concordância', replacements: ['as casas'], rule: 'AGR', categoryId: 'GRAMMAR', category: 'Gramática' }] : []),
    ...(comma >= 0 ? [{ kind: 'grammar', offset: comma, length: 2, message: 'Espaço antes da vírgula', replacements: [','], rule: 'COMMA', categoryId: 'PUNCTUATION', category: 'Pontuação' }] : []),
  ] };
};
const props = (storage, extra = {}) => ({ lang: getLanguage('pt'), storage, fetchImpl: async () => ({ ok: false }), say: () => {}, loadSpeller: async () => speller, checkGrammar: grammar, schedule: (fn) => { fn(); return 0; }, ...extra });

describe('Proofreading (Allan, 2026-10-19: one box, marks as you type, colours, a corrected version)', () => {
  it('lives at /<code>/proof/', () => {
    expect(langFromPath('/casus-world/pt/proof/', '/casus-world/', siteLanguages(SITES.world))).toEqual({ code: 'pt', view: 'proof' });
    expect(proofPath({ path: '/pt/' })).toBe('/pt/proof/');
  });
  it('shares the reader’s text; checks as you type; marks are coloured by kind; explanations beside', async () => {
    const storage = store();
    storage.setItem('casus:input:pt', 'Eu vi as casa e nao sabia , ontem.');
    const { container } = render(Proofread, props(storage));
    await flush();
    expect(container.querySelector('textarea').value).toBe('Eu vi as casa e nao sabia , ontem.');
    expect([...container.querySelectorAll('.backdrop mark')].map((m) => [m.textContent, m.dataset.type])).toEqual([['as casa', 'grammar'], ['nao', 'spelling'], [' ,', 'punctuation']]);
    expect([...container.querySelectorAll('.explain .issue')].map((i) => i.dataset.type)).toEqual(['grammar', 'spelling', 'punctuation']);
    await fireEvent.input(container.querySelector('textarea'), { target: { value: 'Ontem eu vi as casa ali.' } });
    await flush();
    expect(storage.getItem('casus:input:pt')).toBe('Ontem eu vi as casa ali.');
    expect([...container.querySelectorAll('.backdrop mark')].map((m) => m.textContent)).toEqual(['as casa']);
  });
  it('flags a missing full stop and a lower-case start after a line break, which the grammar engine misses (Allan, 2026-10-22)', async () => {
    const storage = store();
    storage.setItem('casus:input:pt', 'Eu moro em Leipzig\nminha casa é pequena');
    const { container } = render(Proofread, props(storage));
    await flush();
    expect([...container.querySelectorAll('.backdrop mark')].map((m) => [m.textContent, m.dataset.type])).toEqual([['Leipzig', 'punctuation'], ['minha', 'casing'], ['pequena', 'punctuation']]);
  });
  it('an engine mark that runs across a line break we read as a sentence end is dropped, ours stay (LanguageTool suggested a comma there)', async () => {
    const storage = store();
    const text = 'Ich wohne in Leipzig\nmeine Wohnung ist klein.';
    storage.setItem('casus:input:de', text);
    const across = async () => ({ engine: 'public', issues: [{ kind: 'grammar', offset: 4, length: 34, message: 'Komma?', replacements: [], rule: 'KOMMA', categoryId: 'PUNCTUATION' }] });
    const { container } = render(Proofread, props(storage, { lang: getLanguage('de'), checkGrammar: across }));
    await flush();
    expect([...container.querySelectorAll('.backdrop mark')].map((m) => [m.textContent, m.dataset.type])).toEqual([['Leipzig', 'punctuation'], ['meine', 'casing']]);
  });
  it('the colour key says it is one, with a count for each kind (Allan, 2026-10-22: "what is that row?")', async () => {
    const storage = store();
    storage.setItem('casus:input:pt', 'Eu vi as casa e nao sabia , ontem.');
    const { container } = render(Proofread, props(storage));
    await flush();
    const key = container.querySelector('.legend');
    expect(key.querySelector('.legend-label').textContent).toMatch(/colou?r/i);
    expect(key.querySelector('.key[data-type=spelling] .n').textContent).toBe('1');
    expect(key.querySelector('.key[data-type=grammar] .n').textContent).toBe('1');
    expect(key.querySelector('.key[data-type=style] .n').textContent).toBe('0');
  });
  it('a click on a marked word opens its corrections; one click swaps it', async () => {
    const storage = store();
    storage.setItem('casus:input:pt', 'Eu vi as casa e nao sabia.');
    const { container } = render(Proofread, props(storage));
    await flush();
    const ta = container.querySelector('textarea');
    ta.setSelectionRange(17, 17);
    await fireEvent.click(ta, { clientX: 50, clientY: 20 });
    await flush();
    const menu = container.querySelector('.fixmenu');
    expect(menu.textContent).toContain('não');
    await fireEvent.click(menu.querySelector('button.fix'));
    await flush();
    expect(ta.value).toBe('Eu vi as casa e não sabia.');
  });
  it('Compare shows the original with its marks beside the corrected text; copy and apply all', async () => {
    const storage = store();
    storage.setItem('casus:input:pt', 'Eu vi as casa e nao sabia.');
    let copied = null;
    const { container } = render(Proofread, props(storage, { copy: (t) => { copied = t; } }));
    await flush();
    await fireEvent.click(container.querySelector('button.compare'));
    await flush();
    expect(container.querySelector('.compare-view .before').textContent).toBe('Eu vi as casa e nao sabia.');
    expect(container.querySelector('.compare-view .after').textContent).toBe('Eu vi as casas e não sabia.');
    expect([...container.querySelectorAll('.compare-view .after ins')].map((m) => m.textContent)).toEqual(['as casas', 'não']);
    await fireEvent.click(container.querySelector('button.copy'));
    expect(copied).toBe('Eu vi as casas e não sabia.');
    await fireEvent.click(container.querySelector('button.apply-all'));
    await flush();
    expect(container.querySelector('textarea').value).toBe('Eu vi as casas e não sabia.');
  });
  it('manual mode waits for the Check button', async () => {
    const storage = store();
    storage.setItem('casus:input:pt', 'e nao sabia.');
    storage.setItem('casus:proof:auto', 'off');
    const { container } = render(Proofread, props(storage));
    await flush();
    expect(container.querySelectorAll('.backdrop mark').length).toBe(0);
    await fireEvent.click(container.querySelector('button.check'));
    await flush();
    expect(container.querySelectorAll('.backdrop mark').length).toBe(1);
  });
  it('text changed in the reader in another tab shows up here', async () => {
    const storage = store();
    const { container } = render(Proofread, props(storage));
    await flush();
    window.dispatchEvent(new StorageEvent('storage', { key: 'casus:input:pt', newValue: 'Texto novo.' }));
    await flush();
    expect(container.querySelector('textarea').value).toBe('Texto novo.');
  });
  it('a language with no checker says so', async () => {
    const { container } = render(Proofread, { lang: getLanguage('fi'), storage: store(), fetchImpl: async () => ({ ok: false }), say: () => {} });
    await flush();
    expect(container.querySelector('.engines').textContent).toMatch(/no (spelling|checker)/i);
  });
});

describe('a word the reader’s dictionary knows is not a misspelling (Allan, 2026-10-19: German compounds)', () => {
  it('Smartphone-App passes when Casus knows Smartphone and App; a real typo still shows', async () => {
    const storage = store();
    storage.setItem('casus:input:de', 'Die Smartphone-App ist gutt.');
    const sp = { correct: (w) => ['Die', 'App', 'ist'].includes(w), suggest: () => ['gut'] };
    const known = async (words) => new Set(words.filter((w) => ['Smartphone', 'App'].includes(w)));
    const { container } = render(Proofread, { lang: getLanguage('de'), storage, fetchImpl: async () => ({ ok: false }), say: () => {}, loadSpeller: async () => sp,
      checkGrammar: async () => ({ engine: 'local', issues: [] }), schedule: (fn) => { fn(); return 0; }, knownWords: known });
    await flush();
    expect([...container.querySelectorAll('.backdrop mark')].map((m) => m.textContent)).toEqual(['gutt']);
  });
});
