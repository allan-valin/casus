import { describe, it, expect } from 'vitest';
import { roleStage, closedStage } from '../../src/lang/fr/stages.js';
import { tokenize } from '../../src/lang/ru/tokenize.js';

const B = (i, surface, analyses) => ({ token: { index: i, surface, key: surface.toLowerCase(), clause: 0 }, candidates: analyses.map((a) => ({ analysis: a, reasons: [], links: [] })), pinned: null });
const V = (person, number, tense = 'pres', mood = 'ind') => ({ lemma: 'v', pos: 'verb', person, number, tense, mood });
const N = (g, n = 'sg') => ({ lemma: 'n', pos: 'noun', gender: g, number: n });
const roles = (bs) => bs.map((b) => b.candidates[0]?.analysis.case ?? '-');
const closed = (words) => closedStage(words.map((w, i) => B(i, w, [N('m')])));

describe('French roles (2026-10-20)', () => {
  it('Le garçon lit le livre: subject, verb, direct object', () => {
    const c = closed(['Le', 'garçon', 'lit', 'le', 'livre']);
    c[2] = B(2, 'lit', [V('3', 'sg')]);
    expect(roles(roleStage(c))).toEqual(['sbj', 'sbj', '-', 'obj', 'obj']);
  });
  it('à / au + noun after the verb is the indirect object: Marie donne le livre au frère', () => {
    const c = closed(['Marie', 'donne', 'le', 'livre', 'au', 'frère']);
    c[1] = B(1, 'donne', [V('3', 'sg')]);
    expect(roles(roleStage(c))).toEqual(['sbj', '-', 'obj', 'obj', 'iobj', 'iobj']);
  });
  it('le before a verb is the object pronoun; lui the indirect object', () => {
    const c = closed(['Je', 'le', 'vois']);
    c[2] = B(2, 'vois', [V('1', 'sg')]);
    const out = roleStage(c);
    expect(out[1].candidates.map((x) => x.analysis.pos)).toEqual(['pron']);
    expect(roles(out)).toEqual(['sbj', 'obj', '-']);
    const two = closed(['Je', 'lui', 'parle']);
    two[2] = B(2, 'parle', [V('1', 'sg')]);
    expect(roles(roleStage(two))[1]).toBe('iobj');
  });
  it("elided forms are their own tokens and in the table: l'homme, j'ai, qu'il", () => {
    const toks = tokenize("J'ai vu l'homme qu'il aime.").filter((t) => t.kind === 'word').map((t) => t.key);
    expect(toks).toEqual(['j', 'ai', 'vu', 'l', 'homme', 'qu', 'il', 'aime']);
    const c = closed(['l', 'j', 'qu', 'du']);
    expect(c[0].candidates.map((x) => x.analysis.pos).sort()).toEqual(['det', 'pron']);
    expect(c[1].candidates[0].analysis.lemma).toBe('je');
    expect(c[3].candidates[0].analysis.pos).toBe('prep');
  });
});
