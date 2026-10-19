import { describe, it, expect } from 'vitest';
import { roleStage } from '../../src/lang/pt/stages.js';

const B = (i, surface, analyses) => ({ token: { index: i, surface, key: surface.toLowerCase(), clause: 0 }, candidates: analyses.map((a) => ({ analysis: a, reasons: [], links: [] })), pinned: null });
const V = (person, number, tense = 'pres', mood = 'ind') => ({ lemma: 'v', pos: 'verb', person, number, tense, mood });
const N = (g, n = 'sg') => ({ lemma: 'n', pos: 'noun', gender: g, number: n });
const ART = (g, n = 'sg') => ({ lemma: 'o', pos: 'det', gender: g, number: n });
const CL = (role) => ({ lemma: 'cl', pos: 'pron', clitic: role });
const roles = (bs) => bs.map((b) => b.candidates[0]?.analysis.case ?? '-');

describe('Portuguese roles by word order and marked pronouns', () => {
  it('subject before the verb, direct object after it: O menino lê o livro', () => {
    const out = roleStage([B(0, 'O', [ART('m'), CL('obj')]), B(1, 'menino', [N('m')]), B(2, 'lê', [V('3', 'sg')]), B(3, 'o', [ART('m'), CL('obj')]), B(4, 'livro', [N('m')])]);
    expect(roles(out)).toEqual(['sbj', 'sbj', '-', 'obj', 'obj']);
    expect(out[0].candidates.map((c) => c.analysis.pos)).toEqual(['det']);
  });
  it('a / para + noun is the indirect object: Maria deu o livro ao irmão', () => {
    const out = roleStage([B(0, 'Maria', [N('f')]), B(1, 'deu', [V('3', 'sg', 'pret')]), B(2, 'o', [ART('m')]), B(3, 'livro', [N('m')]),
      B(4, 'ao', [{ lemma: 'ao', pos: 'prep' }]), B(5, 'irmão', [N('m')])]);
    expect(roles(out)).toEqual(['sbj', '-', 'obj', 'obj', 'iobj', 'iobj']);
  });
  it('o before a verb is the object pronoun; lhe is the indirect object', () => {
    const out = roleStage([B(0, 'Eu', [{ lemma: 'eu', pos: 'pron' }]), B(1, 'o', [ART('m'), CL('obj')]), B(2, 'vejo', [V('1', 'sg')])]);
    expect(out[1].candidates.map((c) => c.analysis.pos)).toEqual(['pron']);
    expect(roles(out)).toEqual(['sbj', 'obj', '-']);
    const two = roleStage([B(0, 'Eu', [{ lemma: 'eu', pos: 'pron' }]), B(1, 'lhe', [CL('iobj')]), B(2, 'disse', [V('1', 'sg', 'pret')])]);
    expect(roles(two)[1]).toBe('iobj');
  });
});
import { closedStage } from '../../src/lang/pt/stages.js';
describe('Portuguese closed-class words', () => {
  it('o is article or object pronoun; lhe the indirect object; ao a + o', () => {
    const out = closedStage([B(0, 'o', [N('m')]), B(1, 'lhe', []), B(2, 'ao', [])]);
    expect(out[0].candidates.map((c) => c.analysis.pos).sort()).toEqual(['det', 'pron']);
    expect(out[1].candidates[0].analysis.clitic).toBe('iobj');
    expect(out[2].candidates[0].analysis.pos).toBe('prep');
  });
  it('leaves other words alone', () => {
    const b = B(0, 'livro', [N('m')]);
    expect(closedStage([b])[0]).toBe(b);
  });
});
describe('Portuguese noun or verb by the article', () => {
  it('after an article a noun; a bare noun-or-verb after a noun phrase is the verb: O menino lê o livro', () => {
    const out = roleStage([B(0, 'O', [ART('m')]), B(1, 'menino', [N('m')]), B(2, 'lê', [V('3', 'sg'), N('m')]), B(3, 'o', [ART('m')]), B(4, 'livro', [N('m'), V('1', 'sg')])]);
    expect(out[2].candidates.map((c) => c.analysis.pos)).toEqual(['verb']);
    expect(out[4].candidates.map((c) => c.analysis.pos)).toEqual(['noun']);
    expect(roles(out)).toEqual(['sbj', 'sbj', '-', 'obj', 'obj']);
  });
});
describe('an intransitive verb with nothing before it: the noun after is the subject (Chegou o trem)', () => {
  it('Chegou o trem → sujeito; Comeu o bolo → objeto', () => {
    const intr = roleStage([B(0, 'Chegou', [{ ...V('3', 'sg', 'past'), valency: 'intr' }]), B(1, 'o', [ART('m')]), B(2, 'trem', [N('m')])]);
    expect(roles(intr)).toEqual(['-', 'sbj', 'sbj']);
    const tr = roleStage([B(0, 'Comeu', [V('3', 'sg', 'past')]), B(1, 'o', [ART('m')]), B(2, 'bolo', [N('m')])]);
    expect(roles(tr)).toEqual(['-', 'obj', 'obj']);
  });
});
describe('the Casus list of verbs that put their subject after them', () => {
  it('chegou (chegar) even without a valency tag', () => {
    const out = roleStage([B(0, 'Chegou', [{ ...V('3', 'sg', 'past'), lemma: 'chegar' }]), B(1, 'o', [ART('m')]), B(2, 'trem', [N('m')])]);
    const cair = roleStage([B(0, 'Caiu', [V('3', 'sg', 'past')]), B(1, 'a', [ART('f')]), B(2, 'chuva', [N('f')])]);
    expect(roles(cair)).toEqual(['-', 'sbj', 'sbj']);
    expect(roles(out)).toEqual(['-', 'sbj', 'sbj']);
  });
});
