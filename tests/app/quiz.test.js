import { describe, it, expect } from 'vitest';
import { createChoiceQuiz } from '../../src/app/lib/quiz.js';

const items = ['a', 'b', 'c', 'd', 'e'].map((x, i) => ({ prompt: x, answer: x.toUpperCase(), i }));
const seq = (...xs) => { let k = 0; return () => xs[k++ % xs.length]; };

describe('multiple-choice quiz (frequent words, phrases)', () => {
  it('four choices, the answer among them, no repeats', () => {
    const q = createChoiceQuiz(items, { random: seq(0.1, 0.5, 0.9, 0.3, 0.7) });
    const { item, choices } = q.current();
    expect(choices).toHaveLength(4);
    expect(new Set(choices).size).toBe(4);
    expect(choices).toContain(item.answer);
  });
  it('scores, counts the streak, and brings a missed item back within three', () => {
    const q = createChoiceQuiz(items, { random: seq(0) });
    const first = q.current().item;
    const wrong = q.current().choices.find((c) => c !== first.answer);
    expect(q.answer(wrong)).toMatchObject({ correct: false, expected: first.answer });
    expect(q.score).toEqual({ right: 0, total: 1 });
    const seen = [];
    for (let k = 0; k < 3; k += 1) { q.next(); seen.push(q.current().item.prompt); q.answer(q.current().item.answer); }
    expect(seen).toContain(first.prompt);
    expect(q.streak).toBeGreaterThan(0);
  });
  it('fewer than four items still works', () => {
    const q = createChoiceQuiz(items.slice(0, 2));
    expect(q.current().choices).toHaveLength(2);
  });
});
