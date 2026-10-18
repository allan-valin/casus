import { describe, it, expect } from 'vitest';
import { getLanguage } from '../../src/lang/registry.js';
import { createState } from '../../src/lib/state.js';

/* German-teacher review, 2026-10-18 (98 sentences). Each test is one finding; the true reading must survive. */
const de = getLanguage('de');
const N = (c, n, g, pos = 'noun', lemma = 'x', extra = {}) => ({ lemma, pos, case: c, number: n, gender: g, ...extra });
const V = (person, number, tense = 'pres', mood = 'ind', lemma = 'v') => ({ lemma, pos: 'verb', person, number, tense, mood });
const ART = (cells, lemma = 'der') => cells.map(([c, n, g]) => N(c, n, g, 'det', lemma));
const LEX = {
  Die: ART([['nom', 'sg', 'f'], ['acc', 'sg', 'f'], ['nom', 'pl', 'x'], ['acc', 'pl', 'x']]),
  die: [...ART([['nom', 'sg', 'f'], ['acc', 'sg', 'f'], ['nom', 'pl', 'x'], ['acc', 'pl', 'x']]), N('nom', 'sg', 'f', 'pron', 'rel'), N('acc', 'sg', 'f', 'pron', 'rel'), N('nom', 'pl', 'x', 'pron', 'rel'), N('acc', 'pl', 'x', 'pron', 'rel')],
  Frau: [N('nom', 'sg', 'f'), N('gen', 'sg', 'f'), N('dat', 'sg', 'f'), N('acc', 'sg', 'f')],
  Kinder: [N('nom', 'pl', 'n'), N('gen', 'pl', 'n'), N('acc', 'pl', 'n')],
  liebt: [V('3', 'sg'), V('2', 'pl')],
  ist: [V('3', 'sg', 'pres', 'ind', 'sein')],
  nett: [{ lemma: 'n', pos: 'adj', case: 'x', number: 'x', gender: 'x', infl: 'x', degree: 'pos' }],
  Er: [N('nom', 'sg', 'm', 'pron', 'er'), N('nom', 'sg', 'm', 'noun', 'derEr')],
  kommt: [V('3', 'sg'), V('2', 'pl')],
  aus: [{ lemma: 'a', pos: 'prep', governs: 'dat' }, { lemma: 'a', pos: 'adv', degree: 'pos' }],
  der: [...ART([['nom', 'sg', 'm'], ['gen', 'sg', 'f'], ['dat', 'sg', 'f'], ['gen', 'pl', 'x']]), { lemma: 'der2', pos: 'det', case: 'x', number: 'x', gender: 'x' }],
  Schweiz: [N('nom', 'sg', 'x'), N('gen', 'sg', 'x'), N('dat', 'sg', 'x'), N('acc', 'sg', 'x')],
  mit: [{ lemma: 'm', pos: 'prep', governs: 'dat' }, { lemma: 'm', pos: 'adv', degree: 'pos' }],
  zwei: [{ lemma: 'z', pos: 'num', case: 'x', number: 'x', gender: 'x' }],
  Freunden: [N('dat', 'pl', 'm')],
  Hunde: [N('nom', 'pl', 'm'), N('gen', 'pl', 'm'), N('acc', 'pl', 'm'), N('dat', 'sg', 'm')],
  Ich: [N('nom', 'sg', 'x', 'pron', 'ich'), N('nom', 'sg', 'n', 'noun', 'dasIch'), N('acc', 'sg', 'n', 'noun', 'dasIch')],
  habe: [V('1', 'sg', 'pres', 'ind', 'haben'), V('3', 'sg', 'x', 'sub1', 'haben')],
  keine: [N('acc', 'sg', 'f', 'pron', 'kein'), N('nom', 'sg', 'f', 'pron', 'kein'), N('acc', 'pl', 'x', 'pron', 'kein'), N('nom', 'pl', 'x', 'pron', 'kein')],
  Zeit: [N('nom', 'sg', 'f'), N('gen', 'sg', 'f'), N('dat', 'sg', 'f'), N('acc', 'sg', 'f')],
  im: [{ lemma: 'i', pos: 'prep', governs: 'dat' }],
  Sommer: [N('nom', 'sg', 'm'), N('dat', 'sg', 'm'), N('acc', 'sg', 'm'), N('dat', 'sg', 'f', 'noun', 'Sommerin'), N('dat', 'pl', 'm')],
  einen: [N('acc', 'sg', 'm', 'det', 'ein'), V('0', 'x', 'x', 'inf', 'einen'), V('1', 'pl', 'pres', 'ind', 'einen')],
  Kaffee: [N('nom', 'sg', 'm'), N('dat', 'sg', 'm'), N('acc', 'sg', 'm')],
  trinkt: [V('3', 'sg'), V('2', 'pl')],
  ruft: [V('3', 'sg'), V('2', 'pl')],
  seine: [...ART([['nom', 'sg', 'f'], ['acc', 'sg', 'f'], ['nom', 'pl', 'x'], ['acc', 'pl', 'x']], 'sein')],
  Mutter: [N('nom', 'sg', 'f'), N('gen', 'sg', 'f'), N('dat', 'sg', 'f'), N('acc', 'sg', 'f')],
  an: [{ lemma: 'p', pos: 'prep', governs: 'acc' }, { lemma: 'p', pos: 'prep', governs: 'dat' }, { lemma: 'p2', pos: 'adv', degree: 'pos' }],
  dass: [{ lemma: 'c', pos: 'conj' }],
  niemand: [N('nom', 'sg', 'x', 'pron', 'n')],
  es: [N('nom', 'sg', 'n', 'pron', 'es'), N('acc', 'sg', 'n', 'pron', 'es')],
  weiß: [V('3', 'sg', 'pres', 'ind', 'wissen'), V('1', 'sg', 'pres', 'ind', 'wissen'), { lemma: 'w', pos: 'adj', case: 'x', number: 'x', gender: 'x', infl: 'x', degree: 'pos' }],
  Mann: [N('nom', 'sg', 'm'), N('dat', 'sg', 'm'), N('acc', 'sg', 'm')],
  steht: [V('3', 'sg'), V('2', 'pl')],
  dort: [{ lemma: 'd', pos: 'adv', degree: 'pos' }],
  Der: ART([['nom', 'sg', 'm'], ['gen', 'sg', 'f'], ['dat', 'sg', 'f'], ['gen', 'pl', 'x']]),
  Sie: [N('nom', 'sg', 'f', 'pron', 'sie'), N('acc', 'sg', 'f', 'pron', 'sie'), N('nom', 'pl', 'x', 'pron', 'sie'), N('acc', 'pl', 'x', 'pron', 'sie')],
  geht: [V('3', 'sg'), V('2', 'pl')],
  zur: [{ lemma: 'z', pos: 'prep', governs: 'dat' }],
  Schule: [N('nom', 'sg', 'f'), N('gen', 'sg', 'f'), N('dat', 'sg', 'f'), N('acc', 'sg', 'f')],
  sieht: [V('3', 'sg')],
};
const lexicon = { lookupAll: async (keys) => new Map(keys.map((k) => [k, LEX[k] ?? []])) };
async function read(text, sentence = 0) {
  const s = createState({ text, lexicon, lang: de });
  await s.load();
  s.select(sentence);
  return s.blocks();
}
const at = (blocks, i) => blocks[i];
const R = (b) => [...new Set(b.candidates.map((c) => [c.analysis.pos, c.analysis.case, c.analysis.number, c.analysis.gender, c.analysis.person, c.analysis.mood].filter((x) => x && x !== 'x').join(' ')))].sort();

describe('A: true readings never lost', () => {
  it('A1: a der-word opening a clause after a comma keeps its relative-pronoun reading', async () => {
    const b = await read('Die Frau, die Kinder liebt, ist nett.');
    expect(R(at(b, 2)).some((r) => r.startsWith('pron nom sg f'))).toBe(true);
  });
  it('A2: a noun without a known gender does not wipe out its article (aus der Schweiz)', async () => {
    const b = await read('Er kommt aus der Schweiz.');
    expect(R(at(b, 3))).toEqual(['det dat sg f']);
  });
});

describe('B: groupings', () => {
  it('B1: a numeral inside the phrase is carried (mit zwei Freunden)', async () => {
    const b = await read('Er kommt mit zwei Freunden.');
    expect(at(b, 2).candidates.every((c) => c.analysis.pos === 'prep')).toBe(true);
    expect(at(b, 4).candidates[0].links.some((l) => l.kind === 'government')).toBe(true);
  });
  it('B3: a clause-final word with nothing to govern is not a preposition (ruft … an)', async () => {
    const b = await read('Er ruft seine Mutter an.');
    expect(R(at(b, 4))).toEqual(['adv']);
  });
});

describe('C: rules that should already have settled it', () => {
  it('C1: a contraction gives its noun the article’s case, number and gender (im Sommer)', async () => {
    const b = await read('Er kommt im Sommer.');
    expect(R(at(b, 3))).toEqual(['noun dat sg m']);
  });
  it('C2: between an article word and its noun only member readings stay (einen Kaffee)', async () => {
    const b = await read('Er trinkt einen Kaffee.');
    expect(R(at(b, 2))).toEqual(['det acc sg m']);
  });
  it('C3: the clause-final finite verb of a dass-clause keeps only verb readings', async () => {
    const b = await read('Er weiß, dass niemand es weiß.');
    expect(R(at(b, 5))).toEqual(['verb sg 3 ind']);
  });
  it('C4: CL5a drops the non-verb readings of the lone verb too (Ich weiß)', async () => {
    const b = await read('Er weiß, dass niemand es weiß.');
    expect(R(at(b, 1)).every((r) => r.startsWith('verb'))).toBe(true);
  });
  it('C4a: an unambiguous ich fixes the verb to 1st person singular', async () => {
    const b = await read('Ich habe keine Zeit.');
    expect(R(at(b, 1))).toEqual(['verb sg 1 ind']);
  });
  it('C5: a sentence-initial pronoun drops its noun reading (Ich, not das Ich)', async () => {
    const b = await read('Ich habe keine Zeit.');
    expect(R(at(b, 0))).toEqual(['pron nom sg']);
  });
});

describe('D: new rules', () => {
  it('D1: once the subject is certain, other phrases are not nominative (keine Zeit is accusative)', async () => {
    const b = await read('Ich habe keine Zeit.');
    expect(R(at(b, 3))).toEqual(['noun acc sg f']);
    expect(R(at(b, 2))).toEqual(['pron acc sg f']);
  });
  it('D1 spares the predicate of sein (copula)', async () => {
    const b = await read('Er ist der Mann.');
    expect(R(at(b, 3))).toContain('noun nom sg m');
  });
  it('D2: sie + 3rd singular verb and no other subject → nominative singular feminine', async () => {
    const b = await read('Sie geht zur Schule.');
    expect(R(at(b, 0))).toEqual(['pron nom sg f']);
  });
  it('D3: a relative pronoun takes gender and number from its antecedent (Der Mann, der dort steht)', async () => {
    const b = await read('Der Mann, der dort steht, ist nett.');
    expect(R(at(b, 2))).toEqual(expect.arrayContaining(['det nom sg m']));
    expect(R(at(b, 2)).every((r) => /sg m/.test(r) || r === 'det')).toBe(true);
  });
  it('D5: a numeral above one makes the phrase plural (Er sieht zwei Hunde → not the old dative singular)', async () => {
    const b = await read('Er sieht zwei Hunde.');
    expect(R(at(b, 3)).some((r) => r.includes('sg'))).toBe(false);
  });
});
