import { describe, it, expect } from 'vitest';
import { CASE_COLORS, VERB_COLOR, FUNCTION_COLOR, NEUTRAL_COLOR, LEGEND, badge, family, blockStyle } from '../../src/app/lib/colors.js';

const ALL = { nominal: true, verb: true, function: true, classes: false };
const noun = (c, n = 'sg') => ({ lemma: '1', pos: 'noun', case: c, number: n, gender: 'f' });
const cand = (a) => ({ analysis: a, reasons: ['lexicon: attested form'] });
const block = (cands, extra = {}) => ({ token: { index: 0, surface: 'x' }, candidates: cands, pinned: null, resolved: cands.length === 1, ...extra });

describe('badge', () => {
  it('spells the seven cases in two letters', () => {
    expect(['nom', 'gen', 'dat', 'acc', 'abl', 'voc', 'loc'].map((c) => badge(noun(c))))
      .toEqual(['Nm', 'Gn', 'Dt', 'Ac', 'Ab', 'Vc', 'Lc']);
  });
  it('spells a verb as person·number tense', () => {
    expect(badge({ pos: 'verb', person: '3', number: 'sg', tense: 'perf', mood: 'ind', voice: 'act' })).toBe('3sg pf');
    expect(badge({ pos: 'verb', person: '0', number: 'x', tense: 'pres', mood: 'inf', voice: 'act' })).toBe('inf pr');
    // Allan, 2026-10-19: the Slavic past by gender (byl), the passive and the negative show on the badge
    expect(badge({ pos: 'verb', number: 'sg', gender: 'm', tense: 'past', mood: 'ind' })).toBe('m.sg past');
    expect(badge({ pos: 'verb', person: 'x', number: 'sg', gender: 'm', tense: 'past', mood: 'ind', voice: 'x', polarity: 'x' })).toBe('m.sg past');
    expect(badge({ pos: 'verb', person: '2', number: 'sg', tense: 'pres', mood: 'ind', voice: 'pass' })).toBe('2sg pr ps');
    expect(badge({ pos: 'verb', person: '3', number: 'sg', tense: 'aor', mood: 'ind', polarity: 'neg' })).toBe('3sg ao neg');
    expect(badge({ pos: 'verb', mood: 'part', tense: 'pres' })).toBe('part pr');
    expect(badge({ pos: 'verb', person: '1', number: 'pl', tense: 'pres', mood: 'ind', definite: 'def' })).toBe('1pl pr def');
  });
  it('a possessed noun shows its owner after the case (Turkish evime: dative, my)', () => {
    expect(badge({ ...noun('dat'), poss: '1sg' })).toBe(`${badge(noun('dat'))} 1sg`);
  });
  it('marks a preposition and gives a dash to the rest', () => {
    expect(badge({ pos: 'prep', governs: ['abl'] })).toBe('Prp');
    expect(badge({ pos: 'conj' })).toBe('—');
  });
});

describe('family', () => {
  it('sorts parts of speech into the three layers', () => {
    expect(family(noun('nom'))).toBe('nominal');
    expect(family({ pos: 'vpar', case: 'nom' })).toBe('nominal');
    expect(family({ pos: 'verb' })).toBe('verb');
    expect(family({ pos: 'prep' })).toBe('function');
    expect(family({ pos: 'conj' })).toBe('function');
  });
});

describe('blockStyle', () => {
  it('uses six Okabe–Ito hues for the cases, validated colour-blind-safe pairwise (docs/FEEDBACK-2026-10-18.md B5)', () => {
    const six = ['nom', 'gen', 'dat', 'acc', 'abl', 'voc'].map((c) => CASE_COLORS[c]);
    expect(new Set(six).size).toBe(6);
    expect(CASE_COLORS.loc).toBe(CASE_COLORS.abl);      // the locative is rare and historically merged into the ablative
  });
  it('gives a resolved nominative a solid nominative border, a tinted fill and the badge', () => {
    const s = blockStyle(block([cand(noun('nom'))]), ALL);
    expect(s.ambiguous).toBe(false);
    expect(s.border).toBe(CASE_COLORS.nom);
    expect(s.borderStyle).toBe('solid');
    expect(s.fill).not.toBe('#fff');
    expect(s.badge).toBe('Nm');
    expect(s.dots).toEqual([]);
  });
  it('shows the plural with a paler fill and a dashed border, so number never rides on colour alone', () => {
    const sg = blockStyle(block([cand(noun('nom', 'sg'))]), ALL);
    const pl = blockStyle(block([cand(noun('nom', 'pl'))]), ALL);
    expect(sg.fill).not.toBe(pl.fill);
    expect(pl.borderStyle).toBe('dashed');
    expect(pl.border).toBe(sg.border);
  });
  it('marks the locative with a double border on the ablative hue', () => {
    const s = blockStyle(block([cand(noun('loc'))]), ALL);
    expect(s.borderStyle).toBe('double');
    expect(s.badge).toBe('Lc');
  });
  it('never blends colours: an ambiguous block is white with a ? and one dot per candidate case', () => {
    const s = blockStyle(block([cand(noun('nom')), cand(noun('abl'))]), ALL);
    expect(s.ambiguous).toBe(true);
    expect(s.fill).toBe('#fff');
    expect(s.badge).toBe('?');
    expect(s.dots).toEqual([CASE_COLORS.nom, CASE_COLORS.abl]);
  });
  it('collapses duplicate hues: two nominative readings of different lemmas are not ambiguous', () => {
    const s = blockStyle(block([cand(noun('nom')), cand({ ...noun('nom'), lemma: '2' })]), ALL);
    expect(s.ambiguous).toBe(false);
  });
  it('tints a preposition with the case it governs; two governed cases make it ambiguous', () => {
    const solid = blockStyle(block([cand({ pos: 'prep', governs: ['abl'] })]), ALL);
    expect(solid.border).toBe(CASE_COLORS.abl);
    const both = blockStyle(block([cand({ pos: 'prep', governs: ['acc', 'abl'] })]), ALL);
    expect(both.ambiguous).toBe(true);
    expect(both.dots).toHaveLength(2);
  });
  it('gives a verb the verb ink and a function word the function ink, both without a case hue', () => {
    const v = blockStyle(block([cand({ pos: 'verb', person: '3', number: 'sg', tense: 'pres' })]), ALL);
    expect(v.border).toBe(VERB_COLOR);
    const f = blockStyle(block([cand({ pos: 'conj' })]), ALL);
    expect(f.border).toBe(FUNCTION_COLOR);
    expect(f.borderStyle).toBe('dotted');
  });
  it('renders a block whose layer is off as neutral with no badge', () => {
    const s = blockStyle(block([cand({ pos: 'verb', person: '3', number: 'sg', tense: 'pres' })]), { ...ALL, verb: false });
    expect(s.fill).toBe('#fff');
    expect(s.border).toBe(NEUTRAL_COLOR);
    expect(s.badge).toBe('');
  });
  it('renders an unknown word white with a ! badge', () => {
    const s = blockStyle(block([]), ALL);
    expect(s.unknown).toBe(true);
    expect(s.fill).toBe('#fff');
    expect(s.badge).toBe('!');
  });
});

describe('legend', () => {
  it('lists every colour and border the page uses, each with its badge and meaning', () => {
    const keys = LEGEND.map((row) => row.key);
    for (const k of ['nom', 'gen', 'dat', 'acc', 'abl', 'voc', 'loc', 'pl', 'verb', 'function', 'unknown', 'ambiguous', 'pinned', 'chunk', 'linked']) {
      expect(keys).toContain(k);
    }
    for (const row of LEGEND) { expect(row.label.length).toBeGreaterThan(3); expect(row.meaning.length).toBeGreaterThan(8); }
  });
});

import { describeAnalysis } from '../../src/app/lib/colors.js';

describe('describeAnalysis', () => {
  it('spells a nominal as pos case number gender', () => {
    expect(describeAnalysis({ pos: 'noun', case: 'abl', number: 'sg', gender: 'f' })).toBe('noun abl sg f');
    expect(describeAnalysis({ pos: 'adj', case: 'acc', number: 'pl', gender: 'c', degree: 'comp' })).toBe('adj acc pl c comp');
  });
  it('spells a verb as person number tense mood voice', () => {
    expect(describeAnalysis({ pos: 'verb', person: '3', number: 'sg', tense: 'perf', mood: 'ind', voice: 'act', conj: '4' })).toBe('verb 3 sg perf ind act');
  });
  it('spells a preposition with what it governs', () => {
    expect(describeAnalysis({ pos: 'prep', governs: ['acc', 'abl'] })).toBe('prep acc/abl');
  });
});
