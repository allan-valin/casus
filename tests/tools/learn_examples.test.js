import { describe, it, expect } from 'vitest';
import { findTarget, withinLevel, gapOf } from '../../tools/learn_examples.mjs';

const toks = (...s) => s.map((surface) => ({ surface }));

describe('Tatoeba sentences for a lesson (Allan, 2026-10-19: dozens, if not hundreds of exercises per lesson)', () => {
  it('the pattern must be whole words: は the particle, not the は inside はな', () => {
    expect(findTarget(toks('私', 'は', '学生', 'です', '。'), 'は')).toEqual([1, 2]);
    expect(findTarget(toks('はな', 'が', '咲く', '。'), 'は')).toBe(null);
    expect(findTarget(toks('行か', 'なければ', 'なら', 'ない'), 'なければならない')).toEqual([1, 4]);
  });
  it('a sentence fits a level when all its kanji are of that level or below', () => {
    const level = { 日: 'N5', 本: 'N5', 響: 'N2' };
    expect(withinLevel('日本です。', level, 'N5')).toBe(true);
    expect(withinLevel('響く日本。', level, 'N5')).toBe(false);
    expect(withinLevel('響く日本。', level, 'N2')).toBe(true);
    expect(withinLevel('鬱だ。', level, 'N1')).toBe(false);          // a kanji outside the lists
  });
  it('the gap replaces the matched words, the rest keeps its furigana', () => {
    const blocks = [{ token: { surface: '私' }, furi: [['私', 'わたし']] }, { token: { surface: 'は' } }, { token: { surface: '学生' }, furi: [['学生', 'がくせい']] }];
    expect(gapOf(blocks, [1, 2])).toEqual([['私', 'わたし'], ['＿＿', null], ['学生', 'がくせい']]);
  });
});
import { findStart, coresOfTitle } from '../../tools/learn_examples.mjs';
describe('patterns from the lesson title, conjugated', () => {
  it('the title gives the cores and their stems', () => {
    expect(coresOfTitle('～させてもらう・～ていただく')).toEqual(['させてもらう', 'させてもら', 'ていただく', 'ていただ']);
    expect(coresOfTitle('次第に')).toEqual(['次第に']);
  });
  it('a core is found from a word boundary and covers the words it reaches into', () => {
    expect(findStart(toks('休ま', 'せて', 'いただき', 'ます'), 'せていただ')).toEqual([1, 3]);
    expect(findStart(toks('私', 'は'), 'せていただ')).toBe(null);
  });
});
import { coveredByLonger } from '../../tools/learn_examples.mjs';
describe('a short pattern inside a longer one belongs to the longer lesson', () => {
  it('も in 触ってもいい is ても, not も', () => {
    const longer = ['ても', 'てもいい', 'にも'];
    expect(coveredByLonger('触ってもいい', 3, 'も', longer)).toBe(true);
    expect(coveredByLonger('私もいい', 1, 'も', longer)).toBe(false);
  });
});
import { motionAfter } from '../../tools/learn_examples.mjs';
describe('precision rules (spot check 2026-10-19)', () => {
  it('no stem shorter than three characters', () => {
    expect(coresOfTitle('～てある')).toEqual(['てある']);
  });
  it('a て-pattern followed by a motion verb is the verb, not the grammar point', () => {
    expect(motionAfter('今夜は家につれていってくれ', 4, 'につれて')).toBe(true);
    expect(motionAfter('夜が更けるにつれて寒くなった', 5, 'につれて')).toBe(false);
  });
});
import { gapRoman } from '../../tools/learn_examples.mjs';
it('gap romaji: the words’ romaji with ___ for the gap', () => {
  const blocks = [{ roman: 'watashi' }, { roman: 'wa' }, { roman: 'gakusei' }, { roman: 'desu' }];
  expect(gapRoman(blocks, [1, 2])).toBe('watashi ___ gakusei desu');
});
