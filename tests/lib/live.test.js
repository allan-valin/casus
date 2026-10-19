import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { parseDefinitions, createLive } from '../../src/lib/live.js';

const fx = (w) => JSON.parse(readFileSync(new URL(`../fixtures/live/${w}.json`, import.meta.url), 'utf8'));
const CS = ['nom', 'gen', 'dat', 'acc', 'voc', 'loc', 'ins'];

describe('Wiktionary definitions read as analyses (Allan, 2026-10-19: load Wiktionary on demand)', () => {
  it('a form of: dative/locative singular of Praha → two readings of the lemma Praha', () => {
    const r = parseDefinitions(fx('Praze'), 'cs', CS);
    expect(r.analyses.map((a) => [a.pos, a.case, a.number])).toEqual([['noun', 'dat', 'sg'], ['noun', 'loc', 'sg']]);
    expect(r.analyses[0].lemma).toBe('w:cs:Praha');
    expect(r.lemmas['w:cs:Praha']).toMatchObject({ headword: 'Praha', pos: 'noun' });
  });
  it('a verb form: first-person singular masculine past of czytać', () => {
    const r = parseDefinitions(fx('czytałem'), 'pl', CS);
    expect(r.analyses[0]).toMatchObject({ pos: 'verb', person: '1', number: 'sg', gender: 'm', tense: 'past', lemma: 'w:pl:czytać' });
  });
  it('a lemma page gives its meaning and the citation form', () => {
    const r = parseDefinitions(fx('borový'), 'cs', CS, 'borový');
    expect(r.analyses[0]).toMatchObject({ pos: 'adj', case: 'nom', number: 'sg', lemma: 'w:cs:borový' });
    expect(r.glosses['w:cs:borový']).toContain('pine');
  });
  it('an alternative form points at another word, to look up', () => {
    expect(parseDefinitions(fx('twą'), 'pl', CS).alternativeOf).toBe('twoją');
  });
  it('another language’s section is not read', () => {
    expect(parseDefinitions(fx('Praze'), 'pl', CS).analyses).toEqual([]);
  });
});

describe('createLive', () => {
  it('asks once per word, tries the capitalised title, caches misses, never throws', async () => {
    const asked = [];
    const fetchImpl = async (url) => {
      asked.push(decodeURIComponent(url.split('/').pop()));
      if (url.endsWith('/Praze')) return { ok: true, json: async () => fx('Praze') };
      return { ok: false, status: 404, json: async () => ({}) };
    };
    const store = new Map();
    const live = createLive({ fetchImpl, code: 'cs', caseIds: CS, storage: { get: (k) => store.get(k), set: (k, v) => store.set(k, v) } });
    const out = await live.lookup(['praze', 'xyzzy']);
    expect(out.get('praze').analyses.length).toBe(2);
    expect(out.get('xyzzy').analyses).toEqual([]);
    expect(asked).toEqual(['praze', 'Praze', 'xyzzy', 'Xyzzy']);
    await live.lookup(['praze', 'xyzzy']);
    expect(asked.length).toBe(4);
  });
});
