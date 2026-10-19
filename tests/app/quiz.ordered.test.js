import { describe, it, expect } from 'vitest';
import { createChoiceQuiz } from '../../src/app/lib/quiz.js';

describe('ordered quiz (Learn: hundreds of exercises, each once, in the lesson’s order)', () => {
  it('goes through the items in order without repeating, a missed one comes back later', () => {
    const items = ['a', 'b', 'c', 'd', 'e', 'f'].map((x) => ({ prompt: x, answer: x.toUpperCase() }));
    const q = createChoiceQuiz(items, { ordered: true, random: () => 0 });
    const seen = [];
    for (let k = 0; k < 6; k += 1) {
      const cur = q.current();
      seen.push(cur.item.prompt);
      q.answer(k === 0 ? 'wrong' : cur.item.answer);
      q.next();
    }
    expect(seen.slice(0, 3)).toEqual(['a', 'b', 'c']);
    expect(seen).toContain('a');
    expect(seen.filter((x) => x === 'a').length).toBe(2);
  });
});
