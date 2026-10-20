import { describe, it, expect } from 'vitest';
import { byOrigin } from '../../src/app/lib/learnorigin.js';

describe('Learn list: human-written lessons first, AI-written and generated in their own section', () => {
  const topics = [
    { id: 'a', lessons: [{ id: 1, ai: true }, { id: 2 }] },
    { id: 'b', lessons: [{ id: 3, generated: true }] },
    { id: 'c', lessons: [{ id: 4 }] },
  ];
  it('splits a mixed topic and keeps the order', () => {
    const { human, made } = byOrigin(topics);
    expect(human.map((t) => [t.id, t.lessons.map((l) => l.id)])).toEqual([['a', [2]], ['c', [4]]]);
    expect(made.map((t) => [t.id, t.lessons.map((l) => l.id)])).toEqual([['a', [1]], ['b', [3]]]);
  });
  it('gives the split copies distinct keys', () => {
    const { human, made } = byOrigin(topics);
    expect(new Set([...human, ...made].map((t) => t.key)).size).toBe(4);
  });
});

import { learnSections } from '../../src/app/lib/learnorigin.js';
describe('Learn list sections by kind of source (Allan, 2026-10-20)', () => {
  it('courses, readers, school, university, then AI/generated — empty sections left out', () => {
    const topics = [
      { id: 's', group: 'school', lessons: [{ id: 1 }] },
      { id: 'c', lessons: [{ id: 2 }, { id: 3, ai: true }] },
      { id: 'u', group: 'university', lessons: [{ id: 4 }] },
      { id: 'r', group: 'reader', lessons: [{ id: 5 }] },
    ];
    expect(learnSections(topics).map((s) => [s.id, s.topics.map((t) => t.id)])).toEqual([
      ['course', ['c']], ['reader', ['r']], ['school', ['s']], ['university', ['u']], ['made', ['c']]]);
  });
});
