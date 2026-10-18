import { describe, it, expect } from 'vitest';
import { getLanguage } from '../../src/lang/registry.js';
import { createState } from '../../src/lib/state.js';

/* Allan on the Grimm and Wikipedia samples, 2026-10-18. */
const de = getLanguage('de');
const N = (c, n, g, pos = 'noun', lemma = 'x', extra = {}) => ({ lemma, pos, case: c, number: n, gender: g, ...extra });
const V = (person, number, tense = 'pres', mood = 'ind', lemma = 'v') => ({ lemma, pos: 'verb', person, number, tense, mood });
const both = (g, pos = 'noun', l = 'x') => [N('nom', 'sg', g, pos, l), N('acc', 'sg', g, pos, l)];
const LEX = {
  Es: [N('nom', 'sg', 'n', 'pron', 'es'), N('acc', 'sg', 'n', 'pron', 'es')], war: [V('3', 'sg', 'pret', 'ind', 'sein')], einmal: [{ lemma: 'e', pos: 'adv', degree: 'pos' }],
  eine: both('f', 'det', 'ein'), kleine: both('f', 'adj', 'klein').map((a) => ({ ...a, infl: 'mixed', degree: 'pos' })), Dirne: [...both('f'), N('gen', 'sg', 'f'), N('dat', 'sg', 'f')],
  Die: both('f', 'det', 'der'), Sprache: [...both('f'), N('gen', 'sg', 'f'), N('dat', 'sg', 'f')], oder: [{ lemma: 'o', pos: 'conj' }],
  Deutsch: [N('nom', 'sg', 'n'), N('gen', 'sg', 'n'), N('dat', 'sg', 'n'), N('acc', 'sg', 'n')], ist: [V('3', 'sg', 'pres', 'ind', 'sein')],
  bis: [{ lemma: 'b', pos: 'prep', governs: 'acc' }, { lemma: 'b', pos: 'conj' }], Millionen: [N('nom', 'pl', 'f'), N('gen', 'pl', 'f'), N('dat', 'pl', 'f'), N('acc', 'pl', 'f')],
  Menschen: [N('nom', 'pl', 'm'), N('dat', 'pl', 'm')], leben: [V('3', 'pl'), V('1', 'pl'), V('0', 'x', 'x', 'inf')], hier: [{ lemma: 'h', pos: 'adv', degree: 'pos' }],
  Großmutter: [...both('f'), N('dat', 'sg', 'f')], die: [...both('f', 'det', 'der'), N('nom', 'sg', 'f', 'pron', 'rel')], wusste: [V('3', 'sg', 'pret', 'ind', 'wissen')],
  was: [N('nom', 'sg', 'x', 'pron', 'was'), N('acc', 'sg', 'x', 'pron', 'was')],
  sie: [N('nom', 'sg', 'f', 'pron', 'sie'), N('acc', 'sg', 'f', 'pron', 'sie'), N('nom', 'pl', 'x', 'pron', 'sie'), N('acc', 'pl', 'x', 'pron', 'sie')],
  geben: [V('0', 'x', 'x', 'inf', 'geben')], sollte: [V('3', 'sg', 'pret', 'ind', 'sollen')], nicht: [{ lemma: 'n', pos: 'adv', degree: 'pos' }],
};
const lexicon = { lookupAll: async (keys) => new Map(keys.map((k) => [k, LEX[k] ?? []])) };
async function read(text) { const s = createState({ text, lexicon, lang: de }); await s.load(); return s.blocks(); }
const R = (b) => [...new Set(b.candidates.map((c) => [c.analysis.pos, c.analysis.case, c.analysis.number, c.analysis.gender].filter((x) => x && x !== 'x').join(' ')))].sort();
const by = (blocks, surface) => blocks.find((b) => b.token.surface === surface);

describe('CL11: with sein/werden/bleiben the noun phrases are nominative', () => {
  it('Es war einmal eine kleine Dirne: Dirne is nominative', async () => {
    const b = await read('Es war einmal eine kleine Dirne.');
    expect(R(by(b, 'Dirne'))).toEqual(['noun nom sg f']);
    expect(R(by(b, 'eine'))).toEqual(['det nom sg f']);
  });
  it('Die Sprache ist eine Sprache: both nominative', async () => {
    const b = await read('Die Sprache ist eine Sprache.');
    expect(b.filter((x) => x.token.surface === 'Sprache').map(R)).toEqual([['noun nom sg f'], ['noun nom sg f']]);
  });
});

describe('NP9: coordinated phrases share their case', () => {
  it('Die Sprache oder Deutsch ist …: Deutsch takes the case of Sprache', async () => {
    const b = await read('Die Sprache oder Deutsch ist eine Sprache.');
    expect(R(by(b, 'Deutsch'))).toEqual(['noun nom sg n']);
  });
});

describe('bis between two numbers is a range, not a preposition', () => {
  it('90 bis 105 Millionen Menschen: bis governs nothing', async () => {
    const b = await read('Hier leben 90 bis 105 Millionen Menschen.');
    expect(by(b, 'bis').candidates.map((c) => c.analysis.pos)).toEqual(['conj']);
    expect(R(by(b, 'Millionen')).length).toBeGreaterThan(1);
  });
});

describe('REF: a personal pronoun points back to the last noun of its gender (Allan: die Großmutter)', () => {
  it('sie links to Großmutter, with the reason saying so', async () => {
    const b = await read('Die Großmutter, die wusste nicht, was sie geben sollte.');
    const sie = by(b, 'sie');
    const ref = sie.candidates.flatMap((c) => c.links).find((l) => l.kind === 'reference');
    expect(b.find((x) => x.token.index === ref.index).token.surface).toBe('Großmutter');
    expect(sie.candidates.flatMap((c) => c.reasons).join(' ')).toMatch(/refers to Großmutter/);
  });
});
