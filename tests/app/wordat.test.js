import { describe, it, expect } from 'vitest';
import { wordAround, candidatesAt, firstKnown } from '../../src/app/lib/wordat.js';

describe('the word under a click in a Learn page (Allan, 2026-10-20: words open their dictionary entry, as in the Reader)', () => {
  it('in a spaced language: the letters around the offset', () => {
    expect(wordAround('Le présent de λύω se forme', 15)).toEqual({ word: 'λύω', start: 14, end: 17 });
    expect(wordAround('오늘 밤은 달이 참 밝다.', 7)).toEqual({ word: '달이', start: 6, end: 8 });
    expect(wordAround('l’homme', 3)).toEqual({ word: 'l’homme', start: 0, end: 7 });
    expect(wordAround('a, b', 1)).toBe(null);
  });
  it('in Japanese or Chinese: spans that cover the offset, longest first', () => {
    const c = candidatesAt('今日は寒いですね。', 4, 4);
    expect(c[0]).toEqual({ word: '日は寒い', start: 1, end: 5 });
    expect(c.every((x) => x.start <= 4 && x.end > 4)).toBe(true);
    expect(c.some((x) => x.word === '寒い')).toBe(true);
  });
  it('the first span the dictionary knows wins', async () => {
    const known = new Set(['寒い', '寒']);
    const hit = await firstKnown(candidatesAt('今日は寒いですね。', 3, 4), async (w) => (known.has(w) ? [{ id: 1 }] : []));
    expect(hit.word).toBe('寒い');
  });
});
