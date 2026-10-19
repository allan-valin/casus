import { describe, it, expect } from 'vitest';
import { makeConjunctionStage, makePersonStage } from '../../src/lib/classical.js';

const B = (i, surface, analyses = [], clause = 0) => ({ token: { index: i, surface, key: surface.toLowerCase(), clause }, candidates: analyses.map((a) => ({ analysis: a, reasons: [], links: [] })), pinned: null });

describe('the language’s own “and” words', () => {
  it('read as the conjunction even where the dictionary lost them (Polish i)', () => {
    const out = makeConjunctionStage(['i', 'a'])([B(0, 'i'), B(1, 'a', [{ pos: 'noun' }])]);
    expect(out[0].candidates[0].analysis.pos).toBe('conj');
    expect(out[1].candidates.map((c) => c.analysis.pos)).toEqual(['noun']);
  });
});

describe('a 1st or 2nd person verb is its own subject', () => {
  const noun = (c) => ({ pos: 'noun', case: c, number: 'sg' });
  it('kupiłem chleb: chleb is not nominative', () => {
    const out = makePersonStage([])([B(0, 'kupiłem', [{ pos: 'verb', person: '1', number: 'sg' }]), B(1, 'chleb', [noun('nom'), noun('acc')])]);
    expect(out[1].candidates.map((c) => c.analysis.case)).toEqual(['acc']);
  });
  it('a copula keeps the nominative (jsem učitel); a 3rd person verb too', () => {
    const cop = makePersonStage(['jsem'])([B(0, 'jsem', [{ pos: 'verb', person: '1', number: 'sg' }]), B(1, 'učitel', [noun('nom'), noun('acc')])]);
    expect(cop[1].candidates.length).toBe(2);
    const third = makePersonStage([])([B(0, 'čte', [{ pos: 'verb', person: '3', number: 'sg' }]), B(1, 'kniha', [noun('nom'), noun('acc')])]);
    expect(third[1].candidates.length).toBe(2);
  });
});
import { makeOneVerbStage } from '../../src/lib/classical.js';
describe('one finite verb per clause', () => {
  const V = (person) => ({ pos: 'verb', person, number: 'sg' });
  it('a word that could be a second finite verb is the noun (Luen kirjaa)', () => {
    const out = makeOneVerbStage([])([B(0, 'Luen', [V('1')]), B(1, 'kirjaa', [{ pos: 'noun', case: 'par' }, V('3')])]);
    expect(out[1].candidates.map((c) => c.analysis.pos)).toEqual(['noun']);
  });
  it('not across a conjunction', () => {
    const out = makeOneVerbStage(['ja'])([B(0, 'Luen', [V('1')]), B(1, 'ja', [{ pos: 'conj' }]), B(2, 'kirjaa', [{ pos: 'noun', case: 'par' }, V('3')])]);
    expect(out[2].candidates.length).toBe(2);
  });
});
describe('the only possible verb agreeing with a sure subject is the verb', () => {
  it('siostra mieszka: mieszka the verb, not the genitive of mieszek', () => {
    const out = makeOneVerbStage([])([B(0, 'siostra', [{ pos: 'noun', case: 'nom', number: 'sg' }]), B(1, 'mieszka', [{ pos: 'verb', person: '3', number: 'sg' }, { pos: 'noun', case: 'gen', number: 'sg' }])]);
    expect(out[1].candidates.map((c) => c.analysis.pos)).toEqual(['verb']);
  });
  it('no sure subject: left alone', () => {
    const out = makeOneVerbStage([])([B(1, 'mieszka', [{ pos: 'verb', person: '3', number: 'sg' }, { pos: 'noun', case: 'gen', number: 'sg' }])]);
    expect(out[0].candidates.length).toBe(2);
  });
});
