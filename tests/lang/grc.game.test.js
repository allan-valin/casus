import { describe, it, expect } from 'vitest';
import { LETTERS, ROWS, createGame } from '../../src/lang/grc/game.js';

const seq = (...xs) => { let i = 0; return () => xs[i++ % xs.length]; };

describe('Greek alphabet drill data', () => {
  it('has the 24 letters with both cases, name and transliteration, in alphabet order', () => {
    const plain = LETTERS.filter((l) => l.row !== 'breathings');
    expect(plain).toHaveLength(24);
    expect(plain[0]).toMatchObject({ lower: 'α', upper: 'Α', names: expect.arrayContaining(['alpha']), sounds: expect.arrayContaining(['a']) });
    expect(plain[23]).toMatchObject({ lower: 'ω', upper: 'Ω' });
    expect(LETTERS.find((l) => l.lower === 'θ').sounds).toContain('th');
  });
  it('groups the letters in rows a learner ticks', () => {
    expect(ROWS.map((r) => r.id)).toEqual(['α-ε', 'ζ-κ', 'λ-ο', 'π-τ', 'υ-ω', 'breathings']);
  });
});

describe('createGame', () => {
  it('draws from the chosen rows and marks an answer by name, ignoring case and spaces', () => {
    const g = createGame({ rows: ['α-ε'], mode: 'name', random: seq(0) });
    expect(g.current().lower).toBe('α');
    expect(g.answer(' Alpha ')).toEqual({ correct: true, expected: 'alpha' });
    expect(g.score).toEqual({ right: 1, total: 1 });
    expect(g.streak).toBe(1);
  });
  it('marks by sound in sound mode, accepting the usual alternatives', () => {
    const g = createGame({ rows: ['υ-ω'], mode: 'sound', random: seq(0.99) });
    expect(g.current().lower).toBe('ω');
    expect(g.answer('o').correct).toBe(true);
  });
  it('brings a missed letter back within the next three draws', () => {
    const g = createGame({ rows: ['α-ε'], mode: 'name', random: seq(0.25, 0, 0, 0, 0) });
    expect(g.current().lower).toBe('β');
    expect(g.answer('gamma')).toEqual({ correct: false, expected: 'beta' });
    expect(g.streak).toBe(0);
    const next3 = [g.next(), g.next(), g.next()].map((l) => l.lower);
    expect(next3).toContain('β');
  });
  it('refuses an empty selection of rows', () => {
    expect(() => createGame({ rows: [], mode: 'name' })).toThrow(/row/);
  });
});
