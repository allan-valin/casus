import { describe, it, expect } from 'vitest';
import { roleStage, closedStage } from '../../src/lang/nl/stages.js';

const B = (i, surface, analyses) => ({ token: { index: i, surface, key: surface.toLowerCase(), clause: 0 }, candidates: analyses.map((a) => ({ analysis: a, reasons: [], links: [] })), pinned: null });
const V = (person, number) => ({ lemma: 'v', pos: 'verb', person, number, tense: 'pres', mood: 'ind' });
const N = (g, n = 'sg') => ({ lemma: 'n', pos: 'noun', gender: g, number: n });
const roles = (bs) => bs.map((b) => b.candidates[0]?.analysis.case ?? '-');
const closed = (words) => closedStage(words.map((w, i) => B(i, w, [N('m')])));

describe('Dutch roles (2026-10-20)', () => {
  it('Ik zie hem: the pronouns carry their case', () => {
    const c = closed(['Ik', 'zie', 'hem']); c[1] = B(1, 'zie', [V('1', 'sg')]);
    expect(roles(roleStage(c))).toEqual(['sbj', '-', 'obj']);
  });
  it('aan + noun after the verb is the indirect object', () => {
    const c = closed(['Jan', 'geeft', 'het', 'boek', 'aan', 'Piet']); c[1] = B(1, 'geeft', [V('3', 'sg')]);
    expect(roles(roleStage(c))).toEqual(['sbj', '-', 'obj', 'obj', 'iobj', 'iobj']);
  });
});
