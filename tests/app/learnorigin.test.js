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
