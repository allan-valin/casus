import { describe, it, expect } from 'vitest';
import { spellIssues, makeSpeller } from '../../../src/lib/proof/spell.js';
import { checkGrammar, LT_CODE } from '../../../src/lib/proof/grammar.js';
import { mergeIssues } from '../../../src/lib/proof/merge.js';

const AFF = 'SET UTF-8\nSFX S Y 1\nSFX S 0 s .\n';
const DIC = '3\ncasa/S\nverde\nbonito\n';

describe('spelling in the page (Hunspell dictionaries, nspell)', () => {
  it('flags unknown words with their place and suggestions; numbers and known words pass', async () => {
    const sp = await makeSpeller(AFF, DIC);
    const issues = spellIssues('As casas verde sao bonitas 2026.', sp, { suggest: true });
    expect(issues.map((i) => [i.word, i.offset])).toEqual([['As', 0], ['sao', 15], ['bonitas', 19]]);
    expect(issues[0].kind).toBe('spelling');
  });
  it('a capitalised sentence start is checked in lower case too', async () => {
    const sp = await makeSpeller(AFF, DIC);
    expect(spellIssues('Casa verde.', sp).length).toBe(0);
  });
});

describe('grammar from LanguageTool: this computer first, the public API otherwise', () => {
  const reply = { matches: [{ offset: 3, length: 5, message: 'Concordância', shortMessage: '', replacements: [{ value: 'casas' }], rule: { id: 'AGREEMENT', category: { name: 'Gramática' } } }] };
  it('uses the local server when it answers', async () => {
    const urls = [];
    const fetchImpl = async (url) => { urls.push(url); return { ok: true, json: async () => reply }; };
    const r = await checkGrammar('As casa verdes.', 'pt', { fetchImpl });
    expect(urls[0]).toMatch(/^http:\/\/localhost:8081\/v2\/check/);
    expect(r.engine).toBe('local');
    expect(r.issues[0]).toMatchObject({ offset: 3, length: 5, kind: 'grammar', replacements: ['casas'] });
  });
  it('falls back to the public API when the local one is not running', async () => {
    const urls = [];
    const fetchImpl = async (url) => { urls.push(url); if (url.includes('localhost')) throw new Error('refused'); return { ok: true, json: async () => reply }; };
    const r = await checkGrammar('As casa verdes.', 'pt', { fetchImpl });
    expect(urls[1]).toMatch(/^https:\/\/api\.languagetool\.org\/v2\/check/);
    expect(r.engine).toBe('public');
  });
  it('a language LanguageTool lacks says so, and nothing is sent', async () => {
    let called = false;
    const r = await checkGrammar('Gallia est omnis divisa.', 'la', { fetchImpl: async () => { called = true; } });
    expect(called).toBe(false);
    expect(r.engine).toBe(null);
    expect(LT_CODE.pt).toBe('pt-BR');
  });
});

describe('merge', () => {
  it('a word LanguageTool already flags is not listed twice; issues come in text order', () => {
    const out = mergeIssues([{ kind: 'spelling', offset: 15, length: 3, word: 'sao' }, { kind: 'spelling', offset: 30, length: 2, word: 'xy' }],
      [{ kind: 'grammar', offset: 14, length: 5, message: 'são' }, { kind: 'grammar', offset: 2, length: 3, message: 'a' }]);
    expect(out.map((i) => i.offset)).toEqual([2, 14, 30]);
  });
});
