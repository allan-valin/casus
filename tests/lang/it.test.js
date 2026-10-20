import { describe, it, expect } from 'vitest';
import { roleStage, closedStage } from '../../src/lang/it/stages.js';

const B = (i, surface, analyses) => ({ token: { index: i, surface, key: surface.toLowerCase(), clause: 0 }, candidates: analyses.map((a) => ({ analysis: a, reasons: [], links: [] })), pinned: null });
const V = (person, number) => ({ lemma: 'v', pos: 'verb', person, number, tense: 'pres', mood: 'ind' });
const N = (g, n = 'sg') => ({ lemma: 'n', pos: 'noun', gender: g, number: n });
const roles = (bs) => bs.map((b) => b.candidates[0]?.analysis.case ?? '-');
const closed = (words) => closedStage(words.map((w, i) => B(i, w, [N('m')])));

describe('Italian roles (2026-10-20)', () => {
  it('Il bambino legge il libro', () => {
    const c = closed(['Il', 'bambino', 'legge', 'il', 'libro']); c[2] = B(2, 'legge', [V('3', 'sg')]);
    expect(roles(roleStage(c))).toEqual(['sbj', 'sbj', '-', 'obj', 'obj']);
  });
  it('a / al + noun after the verb is the indirect object; gli is indirect, lo direct', () => {
    const c = closed(['Maria', 'dà', 'il', 'libro', 'al', 'fratello']); c[1] = B(1, 'dà', [V('3', 'sg')]);
    expect(roles(roleStage(c))).toEqual(['sbj', '-', 'obj', 'obj', 'iobj', 'iobj']);
    const d = closed(['Io', 'lo', 'vedo']); d[2] = B(2, 'vedo', [V('1', 'sg')]);
    expect(roles(roleStage(d))[1]).toBe('obj');
  });
});
