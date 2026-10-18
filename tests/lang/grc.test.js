import { describe, it, expect } from 'vitest';
import codesFixture from '../fixtures/codes.grc.json';
import { getLanguage, LANGUAGES } from '../../src/lang/registry.js';
import { createLexicon, decodeAnalysis } from '../../src/lib/lexicon.js';
import { createState } from '../../src/lib/state.js';

const grc = getLanguage('grc');

describe('Ancient Greek definition', () => {
  it('is registered after Latin at /grc/', () => {
    expect(LANGUAGES.find((l) => l.code === 'grc')).toMatchObject({ path: '/grc/', name: { en: 'Ancient Greek', pt: 'Grego antigo' } });
    expect(grc.wiktionary).toBe('Ancient Greek');
    expect(grc.voice.espeak).toBe('grc');
    expect(grc.eras.map((e) => e.id)).toEqual(['homeric', 'classical', 'koine', 'byzantine', 'modern']);
  });
  it('its code tables mirror the Python ones', () => {
    expect(grc.inventory.codes.json).toEqual(codesFixture);
    expect(decodeAnalysis('ngdm', '7', grc.inventory.codes)).toEqual({ lemma: '7', pos: 'noun', case: 'gen', number: 'du', gender: 'm' });
    expect(decodeAnalysis('v3saoe', '7', grc.inventory.codes)).toEqual({ lemma: '7', pos: 'verb', person: '3', number: 'sg', tense: 'aor', mood: 'opt', voice: 'mp' });
  });
  it('ends sentences at . ; ! but never at the raised dot', () => {
    const s = grc.segment('ἐν ἀρχῇ ἦν ὁ λόγος· καὶ ὁ λόγος ἦν πρὸς τὸν θεόν. τίς εἶ;');
    expect(s.map((x) => x.text)).toEqual(['ἐν ἀρχῇ ἦν ὁ λόγος· καὶ ὁ λόγος ἦν πρὸς τὸν θεόν.', 'τίς εἶ;']);
  });
  it('tokenizes with the elided word kept whole and looked up as its full form', () => {
    const t = grc.tokenize('ἀλλ’ ἐγώ, πάντα δι᾽ αὐτοῦ');
    const words = t.filter((x) => x.kind === 'word');
    expect(words.map((w) => w.surface)).toEqual(['ἀλλ’', 'ἐγώ', 'πάντα', 'δι᾽', 'αὐτοῦ']);
    expect(words.map((w) => w.key)).toEqual(['ἀλλά', 'ἐγώ', 'πάντα', 'διά', 'αὐτοῦ']);
  });
  it('folds the grave accent of running text for lookup', () => {
    expect(grc.tokenize('πρὸς τὸν').filter((x) => x.kind === 'word').map((w) => w.key)).toEqual(['πρόσ', 'τόν']);
  });
});

describe('Greek lexicon: unaccented input matched against the loaded shard', () => {
  const shards = { λο: { 'λόγου': [[5, 'ngsm']], 'λογοῦ': [[9, 'agsm']] } };
  const lexicon = () => createLexicon({ fetchShard: async (n) => shards[n] ?? {}, manifest: { shards: { λο: {} }, key: 'strip' }, codes: grc.inventory.codes, script: grc.script });
  it('finds every accented spelling and says which one each reading came from', async () => {
    const got = await lexicon().lookup('λογου');
    expect(got.map((a) => [a.marked, a.pos, a.case])).toEqual([['λόγου', 'noun', 'gen'], ['λογοῦ', 'adj', 'gen']]);
  });
  it('an accented key is looked up exactly, nothing supplied', async () => {
    const got = await lexicon().lookup('λόγου');
    expect(got).toHaveLength(1);
    expect(got[0].marked).toBe(undefined);
  });
});

describe('Greek cascade: the article settles its noun', () => {
  const analyses = {
    'ὁ': [{ lemma: '1', pos: 'det', case: 'nom', number: 'sg', gender: 'm' }],
    'λόγοσ': [{ lemma: '2', pos: 'noun', case: 'nom', number: 'sg', gender: 'm' }, { lemma: '2', pos: 'noun', case: 'acc', number: 'sg', gender: 'm' }],
    'τὼ': [], 'τώ': [{ lemma: '1', pos: 'det', case: 'nom', number: 'du', gender: 'm' }, { lemma: '1', pos: 'det', case: 'acc', number: 'du', gender: 'm' }],
  };
  const lexicon = { lookupAll: async (keys) => new Map(keys.map((k) => [k, analyses[k] ?? []])) };
  it('narrows a noun by the resolved article, naming it as the witness', async () => {
    const s = createState({ text: 'ὁ λόγος.', lexicon, lang: grc });
    await s.load();
    const noun = s.blocks()[1];
    expect(noun.candidates.map((c) => c.analysis.case)).toEqual(['nom']);
    expect(noun.candidates[0].reasons.join(' ')).toMatch(/ὁ/);
  });
});

describe('Greek lexicon fallback for real-world input (review finding)', () => {
  const shards = {
    αρ: { 'ἀρχῇ': [[1, 'ndsf']], 'ἀρχή': [[1, 'nnsf']], 'ἄρχη': [[2, 'v2ssma']] },
    ανθ: { 'ἄνθρωποσ': [[3, 'nnsm']] },
    εσ: { 'ἐστί': [[4, 'v3spiax']], 'ἐστίν': [[4, 'v3spiax']], 'ἑστία': [[5, 'nnsf']] },
    ην: { 'ἦν': [[6, 'v3siiax']] },
  };
  const lexicon = () => createLexicon({ fetchShard: async (n) => shards[n] ?? {}, manifest: { shards: { αρ: {}, ανθ: {}, εσ: {}, ην: {} }, key: 'strip' }, codes: grc.inventory.codes, script: grc.script });
  it('partly marked input (breathing, no accent) finds the accented forms that share its breathing', async () => {
    const got = await lexicon().lookup('ἀρχη');
    expect(got.map((a) => a.marked).sort()).toEqual(['ἀρχή', 'ἀρχῇ', 'ἄρχη'].sort());
    expect((await lexicon().lookup('ἁρχη'))).toEqual([]);          // a rough breathing excludes the smooth ones
  });
  it('a host with the enclitic’s extra accent finds its form', async () => {
    const got = await lexicon().lookup('ἄνθρωπόσ');
    expect(got.map((a) => a.marked)).toEqual(['ἄνθρωποσ']);
  });
  it('an unaccented enclitic finds its accented dictionary form', async () => {
    const got = await lexicon().lookup('ἐστιν');
    expect(got.map((a) => a.marked)).toEqual(['ἐστίν']);
  });
  it('monotonic modern-keyboard input finds the polytonic forms', async () => {
    // the accent the input does carry (on η) keeps the forms accented there
    expect((await lexicon().lookup('αρχή')).map((a) => a.marked).sort()).toEqual(['ἀρχή', 'ἀρχῇ'].sort());
    expect((await lexicon().lookup('ήν')).map((a) => a.marked)).toEqual(['ἦν']);
  });
});
