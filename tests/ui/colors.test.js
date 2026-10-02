import { describe, it, expect } from 'vitest';
import { CASE_HUES, badge, family, blockStyle } from '../../src/app/lib/colors.js';

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
  it('gives a resolved nominative a solid nominative hue', () => {
    const s = blockStyle(block([cand(noun('nom'))]), ALL);
    expect(s.striped).toBe(false);
    expect(s.background).toContain(`hsl(${CASE_HUES.nom}`);
    expect(s.badge).toBe('Nm');
  });
  it('dims the plural', () => {
    const sg = blockStyle(block([cand(noun('nom', 'sg'))]), ALL).background;
    const pl = blockStyle(block([cand(noun('nom', 'pl'))]), ALL).background;
    expect(sg).not.toBe(pl);
    expect(Number(/(\d+)%\)$/.exec(pl)[1])).toBeGreaterThan(Number(/(\d+)%\)$/.exec(sg)[1]));
  });
  it('stripes an ambiguous block in every candidate hue and badges it ?', () => {
    const s = blockStyle(block([cand(noun('nom')), cand(noun('abl'))]), ALL);
    expect(s.striped).toBe(true);
    expect(s.background).toContain('repeating-linear-gradient');
    expect(s.background).toContain(`hsl(${CASE_HUES.nom}`);
    expect(s.background).toContain(`hsl(${CASE_HUES.abl}`);
    expect(s.badge).toBe('?');
  });
  it('collapses duplicate hues: two nominative readings of different lemmas are one stripe', () => {
    const s = blockStyle(block([cand(noun('nom')), cand({ ...noun('nom'), lemma: '2' })]), ALL);
    expect(s.striped).toBe(false);
  });
  it('tints a preposition with the case it governs, striped when it governs two', () => {
    const solid = blockStyle(block([cand({ pos: 'prep', governs: ['abl'] })]), ALL);
    expect(solid.background).toContain(`hsl(${CASE_HUES.abl}`);
    const both = blockStyle(block([cand({ pos: 'prep', governs: ['acc', 'abl'] })]), ALL);
    expect(both.striped).toBe(true);
  });
  it('renders a block whose layer is off as neutral with no badge', () => {
    const s = blockStyle(block([cand({ pos: 'verb', person: '3', number: 'sg', tense: 'pres' })]), { ...ALL, verb: false });
    expect(s.background).toBe('hsl(0 0% 85%)');
    expect(s.badge).toBe('');
  });
  it('renders an unknown word as neutral with a ! badge', () => {
    const s = blockStyle(block([]), ALL);
    expect(s.unknown).toBe(true);
    expect(s.badge).toBe('!');
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
