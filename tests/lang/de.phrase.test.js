import { describe, it, expect } from 'vitest';
import { getLanguage } from '../../src/lang/registry.js';
import { createState } from '../../src/lib/state.js';

/* Allan, 2026-10-18, on Kafka: inside a noun phrase everything takes the case, number and gender its noun
 * settles; the preposition is a preposition; an old spelling or an unknown inflected word does not cut the
 * phrase. */
const de = getLanguage('de');
const N = (c, n, g, pos = 'noun', lemma = 'x') => ({ lemma, pos, case: c, number: n, gender: g });
const A = {
  Er: [N('nom', 'sg', 'm', 'pron', 'er')],
  lag: [{ lemma: 'v', pos: 'verb', person: '1', number: 'sg', tense: 'pret', mood: 'ind' }, { lemma: 'v', pos: 'verb', person: '3', number: 'sg', tense: 'pret', mood: 'ind' }],
  in: [{ lemma: 'p', pos: 'prep', governs: 'acc' }, { lemma: 'p', pos: 'prep', governs: 'dat' }, { lemma: 'i', pos: 'adj', case: 'x', number: 'x', gender: 'x', infl: 'x', degree: 'pos' }],
  seinem: [N('dat', 'sg', 'm', 'det', 'sein'), N('dat', 'sg', 'n', 'det', 'sein'), N('dat', 'sg', 'm', 'pron', 'seiner'), N('dat', 'sg', 'n', 'pron', 'seiner')],
  Bett: [N('nom', 'sg', 'n'), N('dat', 'sg', 'n'), N('acc', 'sg', 'n')],
  zu: [{ lemma: 'z', pos: 'prep', governs: 'dat' }, { lemma: 'z', pos: 'adv', degree: 'pos' }, { lemma: 'z', pos: 'particle' }],
  einem: [N('dat', 'sg', 'm', 'det', 'ein'), N('dat', 'sg', 'n', 'det', 'ein'), N('dat', 'sg', 'm', 'pron', 'einer'), N('dat', 'sg', 'n', 'pron', 'einer')],
  ungeheuren: [N('dat', 'sg', 'm', 'adj'), N('dat', 'sg', 'n', 'adj'), N('acc', 'sg', 'm', 'adj'), N('gen', 'sg', 'f', 'adj'), N('nom', 'pl', 'x', 'adj')].map((a) => ({ ...a, infl: 'mixed', degree: 'pos' })),
  Ungeziefer: [N('nom', 'sg', 'n'), N('dat', 'sg', 'n'), N('acc', 'sg', 'n'), N('nom', 'pl', 'n')],
};
const lexicon = { lookupAll: async (keys) => new Map(keys.map((k) => [k, A[k] ?? []])) };
async function blocksOf(text) {
  const s = createState({ text, lexicon, lang: de });
  await s.load();
  return Object.fromEntries(s.blocks().map((b) => [b.token.surface, b]));
}
const readings = (b) => [...new Set(b.candidates.map((c) => [c.analysis.pos, c.analysis.case, c.analysis.number, c.analysis.gender].filter(Boolean).join(' ')))];

describe('German noun phrases (Kafka)', () => {
  it('in seinem Bett: Bett settles das, so seinem is det dat sg n and in is the dative preposition', async () => {
    const b = await blocksOf('Er lag in seinem Bett.');
    expect(readings(b.Bett)).toEqual(['noun dat sg n']);
    expect(readings(b.seinem)).toEqual(['det dat sg n']);
    expect([...new Set(b.in.candidates.map((c) => c.analysis.pos))]).toEqual(['prep']);
    expect(b.in.candidates.every((c) => c.analysis.governs.join() === 'dat')).toBe(true);
  });
  it('zu einem ungeheueren Ungeziefer: the old spelling is read as ungeheuren and the phrase is whole', async () => {
    const b = await blocksOf('Er lag zu einem ungeheueren Ungeziefer.');
    expect(readings(b.ungeheueren)).toEqual(['adj dat sg n']);
    expect(b.ungeheueren.candidates[0].reasons.join(' ')).toMatch(/ungeheuren/);
    expect(readings(b.Ungeziefer)).toEqual(['noun dat sg n']);
    expect(readings(b.einem)).toEqual(['det dat sg n']);
    expect(b.zu.candidates.map((c) => c.analysis.pos)).toEqual(['prep']);
  });
  it('agreement looks for the phrase’s own noun, not any noun in the sentence', async () => {
    const b = await blocksOf('Er lag in seinem Bett.');
    expect(b.in.candidates.flatMap((c) => c.reasons).join(' ')).not.toMatch(/matches Er/);
  });
});

describe('German clauses (de.md §10, rules CL1–CL3)', () => {
  const V = (person, number, tense, mood) => ({ lemma: 'v', pos: 'verb', person, number, tense, mood });
  const B = {
    Als: [{ lemma: 'c', pos: 'conj' }],
    Gregor: [{ lemma: 'g', pos: 'noun', case: 'nom', number: 'sg', gender: 'm' }],
    erwachte: [V('1', 'sg', 'pret', 'ind'), V('1', 'sg', 'x', 'sub2'), V('3', 'sg', 'pret', 'ind'), V('3', 'sg', 'x', 'sub2')],
    fand: [V('1', 'sg', 'pret', 'ind'), V('3', 'sg', 'pret', 'ind')],
    er: [{ lemma: 'e', pos: 'pron', case: 'nom', number: 'sg', gender: 'm' }],
    ich: [{ lemma: 'i', pos: 'pron', case: 'nom', number: 'sg', gender: 'x' }],
    sich: [{ lemma: 's', pos: 'pron', case: 'x', number: 'x', gender: 'x' }],
    verwandelt: [V('3', 'sg', 'pres', 'ind'), V('2', 'pl', 'pres', 'ind'), V('0', 'x', 'x', 'ppl2'), V('2', 'pl', 'x', 'imp')],
  };
  const lx = { lookupAll: async (keys) => new Map(keys.map((k) => [k, B[k] ?? []])) };
  async function blocks(text) {
    const s = createState({ text, lexicon: lx, lang: de });
    await s.load();
    return Object.fromEntries(s.blocks().map((b) => [b.token.surface, b]));
  }
  const persons = (b) => [...new Set(b.candidates.map((c) => c.analysis.person))].sort();
  it('CL2: with no ich/wir/du/ihr in its clause a finite verb is 3rd person', async () => {
    const b = await blocks('Als Gregor erwachte, fand er sich verwandelt.');
    expect(persons(b.erwachte)).toEqual(['3']);
    expect(persons(b.fand)).toEqual(['3']);
    expect(b.erwachte.candidates[0].reasons.join(' ')).toMatch(/3rd person/);
  });
  it('CL2 keeps the 1st person when ich is in the clause, and only in that clause', async () => {
    const b = await blocks('Als ich erwachte, fand er sich verwandelt.');
    expect(persons(b.erwachte)).toEqual(['1']);
    expect(persons(b.fand)).toEqual(['3']);
  });
  it('CL3: once the clause has its finite verb, a clause-final participle is the participle', async () => {
    const b = await blocks('Als Gregor erwachte, fand er sich verwandelt.');
    expect(b.verwandelt.candidates.map((c) => c.analysis.mood)).toEqual(['ppl2']);
  });
  it('a caseless reading of an article word drops when the phrase settles its case', async () => {
    const b = await (async () => {
      const C = { in: [{ lemma: 'p', pos: 'prep', governs: 'dat' }], seinem: [{ lemma: 's', pos: 'det', case: 'dat', number: 'sg', gender: 'n' }, { lemma: 't', pos: 'det', case: 'x', number: 'x', gender: 'x' }], Bett: [{ lemma: 'b', pos: 'noun', case: 'dat', number: 'sg', gender: 'n' }] };
      const s = createState({ text: 'in seinem Bett.', lexicon: { lookupAll: async (keys) => new Map(keys.map((k) => [k, C[k] ?? []])) }, lang: de });
      await s.load();
      return Object.fromEntries(s.blocks().map((x) => [x.token.surface, x]));
    })();
    expect(b.seinem.candidates.map((c) => c.analysis.case)).toEqual(['dat']);
  });
});
