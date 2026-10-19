import { describe, it, expect } from 'vitest';
import { splitWords } from '../../src/lang/ja/tokenize.js';

const WORDS = { 今日は: [{ pos: 'interj' }], 今日: [{ pos: 'noun' }], は: [{ pos: 'particle' }], 日曜日: [{ pos: 'noun' }], です: [{ pos: 'verb' }] };
const lexicon = { lookupAll: async (keys) => new Map(keys.map((k) => [k, WORDS[k] ?? []])) };
const run = (surface) => ({ surface, kind: 'word', key: surface, start: 0, end: surface.length, run: true });

describe('Japanese word split', () => {
  it('a greeting written like a phrase (今日は) is the greeting alone, today + は inside a sentence', async () => {
    expect((await splitWords([run('今日は')], lexicon)).map((t) => t.surface)).toEqual(['今日は']);
    expect((await splitWords([run('今日は日曜日です')], lexicon)).map((t) => t.surface)).toEqual(['今日', 'は', '日曜日', 'です']);
  });
});
