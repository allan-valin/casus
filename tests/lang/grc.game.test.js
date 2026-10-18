import { describe, it, expect } from 'vitest';
import { LETTERS, ROWS, createGame, createGrid } from '../../src/lang/grc/game.js';

const seq = (...xs) => { let i = 0; return () => xs[i++ % xs.length]; };

describe('Greek alphabet drill data', () => {
  it('has the 24 letters with both cases, name and transliteration, in alphabet order', () => {
    const plain = LETTERS.filter((l) => l.row !== 'breathings');
    expect(plain).toHaveLength(24);
    expect(plain[0]).toMatchObject({ lower: 'α', upper: 'Α', names: expect.arrayContaining(['alpha']), sounds: expect.arrayContaining(['a']) });
    expect(plain[23]).toMatchObject({ lower: 'ω', upper: 'Ω' });
    expect(LETTERS.find((l) => l.lower === 'θ').sounds).toContain('th');
  });
  it('offers small letters and capitals as separate rows (Allan, 2026-10-18), then the breathings', () => {
    expect(ROWS.map((r) => r.id)).toEqual(['α-ε', 'ζ-κ', 'λ-ο', 'π-τ', 'υ-ω', 'Α-Ε', 'Ζ-Κ', 'Λ-Ο', 'Π-Τ', 'Υ-Ω', 'breathings']);
    expect(ROWS.find((r) => r.id === 'Α-Ε').items.map((i) => i.glyph)).toEqual(['Α', 'Β', 'Γ', 'Δ', 'Ε']);
    expect(ROWS.find((r) => r.id === 'Α-Ε').items[0].letter.sounds).toContain('a');
  });
});

describe('createGame (one letter at a time)', () => {
  it('defaults to typing the sound', () => {
    const g = createGame({ rows: ['α-ε'], random: seq(0) });
    expect(g.mode).toBe('sound');
    expect(g.shown()).toBe('α');
    expect(g.answer(' A ')).toEqual({ correct: true, expected: 'a' });
  });
  it('draws capitals from a capital row', () => {
    const g = createGame({ rows: ['Α-Ε'], random: seq(0.25) });
    expect(g.shown()).toBe('Β');
    expect(g.answer('b').correct).toBe(true);
  });
  it('marks by name in name mode', () => {
    const g = createGame({ rows: ['α-ε'], mode: 'name', random: seq(0) });
    expect(g.answer('Alpha')).toEqual({ correct: true, expected: 'alpha' });
    expect(g.score).toEqual({ right: 1, total: 1 });
  });
  it('brings a missed letter back within the next three draws', () => {
    const g = createGame({ rows: ['α-ε'], mode: 'name', random: seq(0.25, 0, 0, 0, 0) });
    expect(g.shown()).toBe('β');
    expect(g.answer('gamma')).toEqual({ correct: false, expected: 'beta' });
    expect([g.next(), g.next(), g.next()].map((l) => l.lower)).toContain('β');
  });
  it('refuses an empty selection of rows', () => {
    expect(() => createGame({ rows: [] })).toThrow(/row/);
  });
});

describe('createGrid (all letters at once, fill the gaps — Allan’s preferred mode)', () => {
  it('lays out every glyph of the chosen rows, shuffled, each an empty cell', () => {
    const g = createGrid({ rows: ['α-ε', 'Α-Ε'], random: seq(0.9, 0.1, 0.5, 0.3, 0.7) });
    expect(g.cells).toHaveLength(10);
    expect(new Set(g.cells.map((c) => c.glyph))).toEqual(new Set(['α', 'β', 'γ', 'δ', 'ε', 'Α', 'Β', 'Γ', 'Δ', 'Ε']));
    expect(g.cells.map((c) => c.glyph).join('')).not.toBe('αβγδεΑΒΓΔΕ');
    expect(g.cells.every((c) => c.state === 'empty')).toBe(true);
  });
  it('keeps alphabet order when asked', () => {
    const g = createGrid({ rows: ['α-ε'], shuffle: false });
    expect(g.cells.map((c) => c.glyph).join('')).toBe('αβγδε');
  });
  it('checks one cell at a time, in any order; a wrong cell can be tried again', () => {
    const g = createGrid({ rows: ['α-ε'], shuffle: false });
    expect(g.check(3, 'd')).toEqual({ correct: true, expected: 'd' });
    expect(g.check(0, 'b')).toEqual({ correct: false, expected: 'a' });
    expect(g.cells[0].state).toBe('wrong');
    expect(g.check(0, 'a').correct).toBe(true);
    expect(g.cells[0]).toMatchObject({ state: 'right', tries: 2 });
    expect(g.score).toEqual({ right: 2, firstTry: 1, total: 5, done: false });
  });
  it('an empty answer leaves the cell for later', () => {
    const g = createGrid({ rows: ['α-ε'], shuffle: false });
    expect(g.check(1, '   ')).toBe(null);
    expect(g.cells[1].state).toBe('empty');
  });
  it('reveal fills the rest and counts them as not known', () => {
    const g = createGrid({ rows: ['α-ε'], shuffle: false });
    g.check(0, 'a');
    g.reveal();
    expect(g.cells.slice(1).every((c) => c.state === 'revealed')).toBe(true);
    expect(g.score).toEqual({ right: 1, firstTry: 1, total: 5, done: true });
  });
});
