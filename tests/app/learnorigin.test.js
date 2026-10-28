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
      ['course', ['c']], ['reader', ['r']], ['school', ['s']], ['university', ['u']], ['ai', ['c']]]);
  });
});

describe('generated and AI-written apart (Allan, 2026-10-28): generated above, AI-written last', () => {
  it('two sections in that order', () => {
    const topics = [{ id: 'x', lessons: [{ id: 1, ai: true }, { id: 2, generated: true }, { id: 3 }] }, { id: 'y', lessons: [{ id: 4, generated: true }] }];
    expect(learnSections(topics).map((s) => [s.id, s.topics.map((t) => [t.id, t.lessons.map((l) => l.id)])])).toEqual([
      ['course', [['x', [3]]]], ['generated', [['x', [2]], ['y', [4]]]], ['ai', [['x', [1]]]]]);
  });
});

import { learnOrder } from '../../src/app/lib/learnorigin.js';
describe('recommended learning order (Allan, 2026-10-28)', () => {
  const level = { id: 'A1', topics: [
    { id: 'src1', lessons: [{ id: 'cases' }, { id: 'verbs' }, { id: 'wb-1' }, { id: 'wb-2' }, { id: 'wb-3' }, { id: 'wb-4' }, { id: 'wb-5' }] },
    { id: 'src2', lessons: [{ id: 'gen-1', generated: true }, { id: 'ai-1', ai: true }, { id: 'verbs' }] }] };
  const links = { verbs: [{ unit: 'A1-02', title: { en: 'The room' } }, { unit: 'A1-05', title: { en: 'x' } }], cases: [{ unit: 'A1-07', title: { en: 'The office' } }] };
  it('lessons practised in Conversation follow the units; the rest come after, in fours, human before generated before AI', () => {
    const got = learnOrder(level, links);
    expect(got.map((g) => [g.n, g.unit ?? null, g.lessons.map((l) => l.id)])).toEqual([
      [1, 'A1-02', ['verbs']], [2, 'A1-07', ['cases']], [3, null, ['wb-1', 'wb-2', 'wb-3', 'wb-4']], [4, null, ['wb-5', 'gen-1', 'ai-1']]]);
    expect(got[0].unitTitle).toEqual({ en: 'The room' });
  });
  it('without a Conversation course the level is simply cut into lessons of four', () => {
    expect(learnOrder(level, {}).map((g) => g.lessons.length)).toEqual([4, 4, 1]);
  });
});
