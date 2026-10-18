import { describe, it, expect } from 'vitest';
import { getLanguage } from '../../src/lang/registry.js';
import { createState } from '../../src/lib/state.js';

/* Allan, 2026-10-18: Latin and Greek should be surer. Three rules every Latin teacher applies. */
const la = getLanguage('la');
const N = (c, n, g, pos = 'noun', lemma = 'x') => ({ lemma, pos, case: c, number: n, gender: g });
const LEX = {
  a: [{ lemma: 'a1', pos: 'noun', case: 'x', number: 'x', gender: 'm' }, { lemma: 'a2', pos: 'prep', governs: 'abl' }, { lemma: 'a3', pos: 'interj' }],
  belgis: [N('dat', 'pl', 'm'), N('abl', 'pl', 'm')],
  matrona: [N('nom', 'sg', 'f'), N('voc', 'sg', 'f'), N('abl', 'sg', 'f')],
  et: [{ lemma: 'e', pos: 'conj' }],
  sequana: [N('nom', 'sg', 'm'), N('voc', 'sg', 'm'), N('abl', 'sg', 'm'), N('gen', 'pl', 'm')],
  diuidit: [{ lemma: 'd', pos: 'verb', person: '3', number: 'sg', tense: 'pres', mood: 'ind', voice: 'act' }],
  marce: [N('voc', 'sg', 'm')],
  ueni: [{ lemma: 'v', pos: 'verb', person: '2', number: 'sg', tense: 'pres', mood: 'imp', voice: 'act' }],
  amice: [N('voc', 'sg', 'm'), { lemma: 'adv', pos: 'adv', degree: 'pos' }],
  o: [{ lemma: 'o', pos: 'interj' }],
  roma: [N('nom', 'sg', 'f'), N('voc', 'sg', 'f'), N('abl', 'sg', 'f')],
};
const lexicon = { lookupAll: async (keys) => new Map(keys.map((k) => [k, LEX[k] ?? []])) };
async function read(text) { const s = createState({ text, lexicon, lang: la }); await s.load(); return s.blocks(); }
const cases = (b) => [...new Set(b.candidates.map((c) => c.analysis.case ?? c.analysis.pos))].sort();

describe('classical rules (Latin, Greek)', () => {
  it('a preposition that has taken its object is the preposition (a Belgis)', async () => {
    const b = await read('a Belgis Matrona et Sequana diuidit.');
    expect([...new Set(b[0].candidates.map((c) => c.analysis.pos))]).toEqual(['prep']);
  });
  it('no vocative without address: no 2nd person, imperative or o in the sentence', async () => {
    const b = await read('a Belgis Matrona et Sequana diuidit.');
    expect(cases(b[2])).not.toContain('voc');
  });
  it('a word that only might be an imperative (qui: also of queo) does not make the sentence an address', async () => {
    LEX.qui = [{ lemma: 'q', pos: 'pron', case: 'nom', number: 'pl', gender: 'm' }, { lemma: 'q2', pos: 'verb', person: '2', number: 'sg', tense: 'pres', mood: 'imp', voice: 'act' }];
    const b = await read('Matrona qui diuidit.');
    expect(cases(b[0])).not.toContain('voc');
  });
  it('the vocative stays when the sentence addresses someone', async () => {
    expect(cases((await read('Marce, ueni.'))[0])).toEqual(['voc']);
    expect(cases((await read('o Roma diuidit.'))[1])).toContain('voc');
  });
  it('words joined by et share their case (Matrona et Sequana)', async () => {
    const b = await read('a Belgis Matrona et Sequana diuidit.');
    expect(cases(b[4])).toEqual(cases(b[2]));
    expect(cases(b[4])).not.toContain('gen');
  });
});

describe('NUM: a clause’s lone finite verb rules out nominatives of the other number', () => {
  const L2 = {
    gallia: [N('nom', 'sg', 'f'), N('abl', 'sg', 'f')], est: [{ lemma: 's', pos: 'verb', person: '3', number: 'sg', tense: 'pres', mood: 'ind', voice: 'act' }],
    diuisa: [{ lemma: 'd', pos: 'vpar', case: 'nom', number: 'sg', gender: 'f' }, { lemma: 'd', pos: 'vpar', case: 'nom', number: 'pl', gender: 'n' }, { lemma: 'd', pos: 'vpar', case: 'acc', number: 'pl', gender: 'n' }],
    sunt: [{ lemma: 's', pos: 'verb', person: '3', number: 'pl', tense: 'pres', mood: 'ind', voice: 'act' }],
    uiri: [N('gen', 'sg', 'm'), N('nom', 'pl', 'm')], boni: [N('gen', 'sg', 'm', 'adj'), N('nom', 'pl', 'm', 'adj')], et: [{ lemma: 'e', pos: 'conj' }],
    marcus: [N('nom', 'sg', 'm')],
  };
  const lx = { lookupAll: async (keys) => new Map(keys.map((k) => [k, L2[k] ?? []])) };
  const read2 = async (t) => { const s = createState({ text: t, lexicon: lx, lang: la }); await s.load(); return s.blocks(); };
  const R = (b) => b.candidates.map((c) => `${c.analysis.case} ${c.analysis.number}`).sort();
  it('Gallia est divisa: divisa is not nominative plural', async () => {
    expect(R((await read2('Gallia est diuisa.'))[2])).toEqual(['nom sg']);          // and agreement with Gallia settles it
  });
  it('uiri boni sunt: a plural verb rules out the genitive-singular-only reading? no — only nominatives of the other number drop', async () => {
    expect(R((await read2('Viri boni sunt.'))[0])).toEqual(['gen sg', 'nom pl']);
  });
  it('coordination keeps a plural verb with two singular subjects (Marcus et Gallia sunt)', async () => {
    expect(R((await read2('Marcus et Gallia sunt.'))[0])).toEqual(['nom sg']);
  });
});

describe('REL: a relative pronoun after a comma agrees in gender and number with the nearest noun before it', () => {
  const L3 = {
    partes: [N('nom', 'pl', 'f'), N('acc', 'pl', 'f')], in: [{ lemma: 'i', pos: 'prep', governs: 'acc' }, { lemma: 'i', pos: 'prep', governs: 'abl' }],
    quarum: [N('gen', 'pl', 'f', 'pron', 'qui'), N('gen', 'pl', 'f', 'pron', 'quis')],
    quae: [N('nom', 'sg', 'f', 'pron', 'qui'), N('nom', 'pl', 'f', 'pron', 'qui'), N('nom', 'pl', 'n', 'pron', 'qui'), N('acc', 'pl', 'n', 'pron', 'qui')],
    incolunt: [{ lemma: 'i2', pos: 'verb', person: '3', number: 'pl', tense: 'pres', mood: 'ind', voice: 'act' }],
    urbs: [N('nom', 'sg', 'f')], est: [{ lemma: 's', pos: 'verb', person: '3', number: 'sg', tense: 'pres', mood: 'ind', voice: 'act' }],
    magna: [N('nom', 'sg', 'f', 'adj'), N('abl', 'sg', 'f', 'adj'), N('nom', 'pl', 'n', 'adj')],
  };
  const lx = { lookupAll: async (keys) => new Map(keys.map((k) => [k, L3[k] ?? []])) };
  const read3 = async (t) => { const s = createState({ text: t, lexicon: lx, lang: la }); await s.load(); return s.blocks(); };
  it('urbs, quae magna est: quae is feminine singular', async () => {
    const b = await read3('Urbs, quae magna est.');
    expect(b[1].candidates.map((c) => `${c.analysis.case} ${c.analysis.number} ${c.analysis.gender}`)).toEqual(['nom sg f']);
  });
});

describe('agreement stays inside its clause (regression: Gallia lost its nominative to nostra three clauses later)', () => {
  const L4 = {
    gallia: [N('nom', 'sg', 'f'), N('abl', 'sg', 'f')], est: [{ lemma: 's', pos: 'verb', person: '3', number: 'sg', tense: 'pres', mood: 'ind', voice: 'act' }],
    nostra: [N('abl', 'sg', 'f', 'adj')], galli: [N('nom', 'pl', 'm')], appellantur: [{ lemma: 'a', pos: 'verb', person: '3', number: 'pl', tense: 'pres', mood: 'ind', voice: 'pass' }],
  };
  const lx = { lookupAll: async (keys) => new Map(keys.map((k) => [k, L4[k] ?? []])) };
  it('Gallia est, nostra Galli appellantur: Gallia keeps its nominative', async () => {
    const s = createState({ text: 'Gallia est, nostra Galli appellantur.', lexicon: lx, lang: la });
    await s.load();
    expect(s.blocks()[0].candidates.map((c) => c.analysis.case).sort()).toEqual(['abl', 'nom']);
  });
});
