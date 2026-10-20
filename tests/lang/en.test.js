import { describe, it, expect } from 'vitest';
import { roleStage, closedStage } from '../../src/lang/en/stages.js';

const B = (i, surface, analyses) => ({ token: { index: i, surface, key: surface.toLowerCase(), clause: 0 }, candidates: analyses.map((a) => ({ analysis: a, reasons: [], links: [] })), pinned: null });
const V = (person, number) => ({ lemma: 'v', pos: 'verb', person, number, tense: 'pres', mood: 'ind' });
const N = (n = 'sg') => ({ lemma: 'n', pos: 'noun', number: n });
const roles = (bs) => bs.map((b) => b.candidates[0]?.analysis.case ?? '-');
const closed = (words) => closedStage(words.map((w, i) => B(i, w, [N()])));

describe('English roles (2026-10-20)', () => {
  it('The boy reads the book', () => {
    const c = closed(['The', 'boy', 'reads', 'the', 'book']); c[2] = B(2, 'reads', [V('3', 'sg')]);
    expect(roles(roleStage(c))).toEqual(['sbj', 'sbj', '-', 'obj', 'obj']);
  });
  it('object pronouns are objects wherever they stand; to + noun after the verb is indirect', () => {
    const c = closed(['She', 'sees', 'him']); c[1] = B(1, 'sees', [V('3', 'sg')]);
    expect(roles(roleStage(c))).toEqual(['sbj', '-', 'obj']);
    const g = closed(['Mary', 'gave', 'the', 'book', 'to', 'John']); g[1] = B(1, 'gave', [V('3', 'sg')]);
    expect(roles(roleStage(g))).toEqual(['sbj', '-', 'obj', 'obj', 'iobj', 'iobj']);
  });
});
