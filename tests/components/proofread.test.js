// @vitest-environment jsdom
import { describe, it, expect } from 'vitest';
import { render, fireEvent } from '@testing-library/svelte';
import { tick } from 'svelte';
import Proofread from '../../src/app/components/Proofread.svelte';
import { getLanguage } from '../../src/lang/registry.js';
import { langFromPath, proofPath } from '../../src/app/lib/route.js';

const flush = async () => { for (let i = 0; i < 8; i += 1) { await tick(); await new Promise((r) => setTimeout(r, 0)); } };
const store = () => { const m = new Map(); return { getItem: (k) => m.get(k) ?? null, setItem: (k, v) => m.set(k, String(v)) }; };

describe('Proofreading tab (Allan, 2026-10-18/19)', () => {
  it('lives at /<code>/proof/', () => {
    expect(langFromPath('/casus/pt/proof/', '/casus/')).toEqual({ code: 'pt', view: 'proof' });
    expect(langFromPath('/proof/', '/')).toEqual({ code: 'la', view: 'proof' });
    expect(proofPath({ path: '/pt/' })).toBe('/pt/proof/');
  });
  it('checks spelling and grammar, marks them in the text, applies a suggestion', async () => {
    const storage = store();
    storage.setItem('casus:input:pt', 'Eu vi as casa e nao sabia.');
    const said = [];
    const speller = { correct: (w) => w !== 'nao', suggest: () => ['não'] };
    const grammar = async (text) => ({ engine: 'public', issues: [{ kind: 'grammar', offset: 6, length: 7, message: 'Concordância', replacements: ['as casas'], rule: 'X', category: '' }] });
    const { container } = render(Proofread, { lang: getLanguage('pt'), storage, fetchImpl: async () => ({ ok: false }), say: (k) => said.push(k), loadSpeller: async () => speller, checkGrammar: grammar });
    await flush();
    expect(container.querySelector('textarea').value).toBe('Eu vi as casa e nao sabia.');
    await fireEvent.click(container.querySelector('button.check'));
    await flush();
    const issues = [...container.querySelectorAll('.issue')];
    expect(issues.map((i) => i.dataset.kind)).toEqual(['grammar', 'spelling']);
    expect([...container.querySelectorAll('.mirror mark')].map((m) => m.textContent)).toEqual(['as casa', 'nao']);
    expect(container.querySelector('.engines').textContent).toMatch(/public/i);
    await fireEvent.click(issues[1].querySelector('button.fix'));
    await flush();
    expect(container.querySelector('textarea').value).toBe('Eu vi as casa e não sabia.');
    await fireEvent.click(container.querySelector('.issue[data-kind="grammar"] button.fix'));
    await flush();
    expect(container.querySelector('textarea').value).toBe('Eu vi as casas e não sabia.');
  });
  it('a language with no checker says so', async () => {
    const { container } = render(Proofread, { lang: getLanguage('fi'), storage: store(), fetchImpl: async () => ({ ok: false }), say: () => {} });
    await flush();
    expect(container.querySelector('.engines').textContent).toMatch(/no (spelling|checker)/i);
  });
});
