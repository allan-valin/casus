import { describe, it, expect } from 'vitest';
import { roleStage, closedStage } from '../../src/lang/es/stages.js';

const B = (i, surface, analyses) => ({ token: { index: i, surface, key: surface.toLowerCase(), clause: 0 }, candidates: analyses.map((a) => ({ analysis: a, reasons: [], links: [] })), pinned: null });
const V = (person, number) => ({ lemma: 'v', pos: 'verb', person, number, tense: 'pres', mood: 'ind' });
const N = (g, n = 'sg') => ({ lemma: 'n', pos: 'noun', gender: g, number: n });
const roles = (bs) => bs.map((b) => b.candidates[0]?.analysis.case ?? '-');
const closed = (words) => closedStage(words.map((w, i) => B(i, w, [N('m')])));

describe('Spanish roles (2026-10-20)', () => {
  it('El niño lee el libro', () => {
    const c = closed(['El', 'niño', 'lee', 'el', 'libro']); c[2] = B(2, 'lee', [V('3', 'sg')]);
    expect(roles(roleStage(c))).toEqual(['sbj', 'sbj', '-', 'obj', 'obj']);
  });
  it('a / al + noun after the verb is the indirect object; le is indirect, lo direct', () => {
    const c = closed(['María', 'da', 'el', 'libro', 'al', 'hermano']); c[1] = B(1, 'da', [V('3', 'sg')]);
    expect(roles(roleStage(c))).toEqual(['sbj', '-', 'obj', 'obj', 'iobj', 'iobj']);
    const p = closed(['Yo', 'le', 'hablo']); p[2] = B(2, 'hablo', [V('1', 'sg')]);
    expect(roles(roleStage(p))[1]).toBe('iobj');
    const d = closed(['Yo', 'lo', 'veo']); d[2] = B(2, 'veo', [V('1', 'sg')]);
    expect(roles(roleStage(d))[1]).toBe('obj');
  });
});
