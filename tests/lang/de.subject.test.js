import { describe, it, expect } from 'vitest';
import { getLanguage } from '../../src/lang/registry.js';
import { createState } from '../../src/lib/state.js';

/* Allan, 2026-10-18: "it must use context from the sentence for ambiguity". */
const de = getLanguage('de');
const N = (c, n, g, pos = 'noun', lemma = 'x') => ({ lemma, pos, case: c, number: n, gender: g });
const V = (person, number, lemma, mood = 'ind', tense = 'pres') => ({ lemma, pos: 'verb', person, number, tense, mood });
const all4 = (n, g, pos = 'noun', l = 'x') => ['nom', 'gen', 'dat', 'acc'].map((c) => N(c, n, g, pos, l));
const LEX = {
  Das: [N('nom', 'sg', 'n', 'det', 'der'), N('acc', 'sg', 'n', 'det', 'der')], das: [N('nom', 'sg', 'n', 'det', 'der'), N('acc', 'sg', 'n', 'det', 'der')],
  Wünschen: [N('nom', 'sg', 'n'), N('dat', 'sg', 'n'), N('acc', 'sg', 'n')],
  hat: [V('3', 'sg', 'haben')], geholfen: [{ lemma: 'helfen', pos: 'verb', person: '0', number: 'x', tense: 'perf', mood: 'ppl2' }],
  Die: [N('nom', 'sg', 'f', 'det', 'der'), N('acc', 'sg', 'f', 'det', 'der'), N('nom', 'pl', 'x', 'det', 'der'), N('acc', 'pl', 'x', 'det', 'der')],
  die: [N('nom', 'sg', 'f', 'det', 'der'), N('acc', 'sg', 'f', 'det', 'der'), N('nom', 'pl', 'x', 'det', 'der'), N('acc', 'pl', 'x', 'det', 'der')],
  Frau: all4('sg', 'f'), deren: [N('gen', 'sg', 'f', 'pron', 'der')], Sohn: [N('nom', 'sg', 'm'), N('dat', 'sg', 'm'), N('acc', 'sg', 'm')],
  schläft: [V('3', 'sg', 'schlafen')], lacht: [V('3', 'sg', 'lachen'), V('2', 'pl', 'lachen', 'imp')],
  Er: [N('nom', 'sg', 'm', 'pron', 'er')], hilft: [V('3', 'sg', 'helfen')],
  der: [N('nom', 'sg', 'm', 'det', 'der'), N('gen', 'sg', 'f', 'det', 'der'), N('dat', 'sg', 'f', 'det', 'der'), N('gen', 'pl', 'x', 'det', 'der')],
  Der: [N('nom', 'sg', 'm', 'det', 'der'), N('gen', 'sg', 'f', 'det', 'der'), N('dat', 'sg', 'f', 'det', 'der'), N('gen', 'pl', 'x', 'det', 'der')],
  Mann: [N('nom', 'sg', 'm'), N('dat', 'sg', 'm'), N('acc', 'sg', 'm')], sieht: [V('3', 'sg', 'sehen')],
  Kinder: [N('nom', 'pl', 'n'), N('gen', 'pl', 'n'), N('acc', 'pl', 'n')],
  nicht: [{ lemma: 'n', pos: 'adv', degree: 'pos' }, { lemma: 'n', pos: 'interj' }],
  Sie: [N('nom', 'sg', 'f', 'pron', 'sie'), N('acc', 'sg', 'f', 'pron', 'sie'), N('nom', 'pl', 'x', 'pron', 'sie'), N('acc', 'pl', 'x', 'pron', 'sie')],
  gibt: [V('3', 'sg', 'geben')], dem: [N('dat', 'sg', 'm', 'det', 'der'), N('dat', 'sg', 'n', 'det', 'der')], Kind: [N('nom', 'sg', 'n'), N('dat', 'sg', 'n'), N('acc', 'sg', 'n')],
  Buch: [N('nom', 'sg', 'n'), N('dat', 'sg', 'n'), N('acc', 'sg', 'n')],
};
const VALENCY = { helfen: ['dat'], sehen: ['acc'], geben: ['dat', 'acc'] };
const lexicon = { lookupAll: async (keys) => new Map(keys.map((k) => [k, LEX[k] ?? []])), file: async (n) => (n === 'valency.json' ? VALENCY : null) };
async function read(text) { const s = createState({ text, lexicon, lang: de }); await s.load(); return s.blocks(); }
const C = (b) => [...new Set(b.candidates.map((c) => c.analysis.case).filter(Boolean))].sort();
const by = (blocks, surface) => blocks.find((b) => b.token.surface === surface);

describe('SUBJ: a finite verb has a subject', () => {
  it('Das Wünschen hat geholfen: the only possible nominative is the subject', async () => {
    const b = await read('Das Wünschen hat geholfen.');
    expect(C(by(b, 'Wünschen'))).toEqual(['nom']);
    expect(C(by(b, 'Das'))).toEqual(['nom']);
    expect(by(b, 'Wünschen').candidates[0].reasons.join(' ')).toMatch(/subject/);
  });
  it('Die Frau, deren Sohn schläft, lacht: Sohn subject of the relative clause, Frau of the main clause around it', async () => {
    const b = await read('Die Frau, deren Sohn schläft, lacht.');
    expect(C(by(b, 'Sohn'))).toEqual(['nom']);
    expect(C(by(b, 'Frau'))).toEqual(['nom']);
  });
  it('a clause with a certain subject has no second nominative: Er sieht die Kinder', async () => {
    const b = await read('Er sieht die Kinder.');
    expect(C(by(b, 'Kinder'))).toEqual(['acc']);
  });
});

describe('NUM: the verb’s number rules out nominatives of the other number', () => {
  it('Der Mann sieht die Kinder: Kinder is not the subject', async () => {
    const b = await read('Der Mann sieht die Kinder.');
    expect(C(by(b, 'Kinder'))).toEqual(['acc']);
    expect(C(by(b, 'Mann'))).toEqual(['nom']);
  });
});

describe('CL10: verb valency', () => {
  it('Er hilft der Frau: helfen takes the dative', async () => {
    const b = await read('Er hilft der Frau.');
    expect(C(by(b, 'Frau'))).toEqual(['dat']);
    expect(C(by(b, 'der'))).toEqual(['dat']);
  });
  it('the valency of the participle counts, not the auxiliary: Er hat der Frau geholfen', async () => {
    const b = await read('Er hat der Frau geholfen.');
    expect(C(by(b, 'Frau'))).toEqual(['dat']);
  });
  it('never guesses between two possible subjects: Sie gibt dem Kind das Buch', async () => {
    const b = await read('Sie gibt dem Kind das Buch.');
    expect(C(by(b, 'Buch'))).toEqual(['acc', 'nom']);
    expect(C(by(b, 'Kind'))).toEqual(['dat']);
  });
});

describe('INTERJ: an interjection stands alone', () => {
  it('nicht inside a clause is the adverb', async () => {
    const b = await read('Er schläft nicht.');
    expect(by(b, 'nicht').candidates.map((c) => c.analysis.pos)).toEqual(['adv']);
  });
});

describe('SUBJ inside an als-clause, with a two-word name', () => {
  const L2 = {
    Als: [{ lemma: 'als', pos: 'conj' }], Gregor: [N('nom', 'sg', 'x'), N('dat', 'sg', 'x'), N('acc', 'sg', 'x')], Samsa: [N('nom', 'sg', 'x'), N('dat', 'sg', 'x'), N('acc', 'sg', 'x')],
    erwachte: [V('3', 'sg', 'erwachen', 'ind', 'pret')], fand: [V('3', 'sg', 'finden', 'ind', 'pret')], er: [N('nom', 'sg', 'm', 'pron', 'er')],
  };
  const lx = { lookupAll: async (keys) => new Map(keys.map((k) => [k, L2[k] ?? []])), file: async () => null };
  it('Als Gregor Samsa erwachte: the name is the subject, both words', async () => {
    const s = createState({ text: 'Als Gregor Samsa erwachte, fand er.', lexicon: lx, lang: de });
    await s.load();
    const b = s.blocks();
    expect(C(by(b, 'Samsa'))).toEqual(['nom']);
    expect(C(by(b, 'Gregor'))).toEqual(['nom']);
  });
});
