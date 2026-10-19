import { describe, it, expect } from 'vitest';
import { lessonQuestions, practiceQuestions, coreOf } from '../../src/lib/learn/questions.js';

const g = (id, pattern, meaning, text, en) => ({ id, kind: 'grammar', pattern, meaning: { en: meaning }, examples: [{ text, en }] });
const level = { id: 'N5', units: [{ kind: 'grammar', lessons: [g('wa', '〜は', 'topic', '私は学生です。', 'I am a student.'), g('ga', '〜が（subject）', 'subject', '雨が降っています。', 'It is raining.'), g('o', '〜を', 'object', 'パンを食べます。', 'I eat bread.'), g('ni', '〜に', 'to, at', '学校に行きます。', 'I go to school.')] },
  { kind: 'vocab', lessons: [{ id: 'v1', kind: 'vocab', words: [{ w: '会う', reading: 'あう', en: 'to meet' }, { w: '青', reading: 'あお', en: 'blue' }, { w: '赤', reading: 'あか', en: 'red' }, { w: '朝', reading: 'あさ', en: 'morning' }] }] }] };
const learn = { levels: [level, { id: 'N4', units: [{ kind: 'grammar', lessons: [g('kara', '〜から', 'because', '雨だから行かない。', 'It is raining, so I will not go.')] }] }] };

describe('Learn questions (Allan, 2026-10-19)', () => {
  it('the core of a pattern: no 〜, no notes in brackets', () => {
    expect(coreOf('〜が（subject）')).toBe('が');
    expect(coreOf('〜ている')).toBe('ている');
  });
  it('a grammar lesson asks its meaning, fills its gap in the example, and asks the example’s translation — each with answers of its own kind', () => {
    const qs = lessonQuestions(level.units[0].lessons[0], level);
    const meaning = qs.find((q) => q.type === 'meaning');
    expect(meaning).toMatchObject({ prompt: '〜は', answer: 'topic' });
    expect(meaning.pool).toEqual(expect.arrayContaining(['subject', 'object']));
    const gap = qs.find((q) => q.type === 'gap');
    expect(gap.prompt).toBe('私＿＿学生です。');
    expect(gap.answer).toBe('は');
    expect(gap.pool).toEqual(expect.arrayContaining(['が', 'を']));
    expect(qs.find((q) => q.type === 'translate')).toMatchObject({ prompt: '私は学生です。', answer: 'I am a student.' });
    expect(qs.every((q) => q.lesson === 'wa')).toBe(true);
  });
  it('a vocabulary lesson asks each word both ways', () => {
    const qs = lessonQuestions(level.units[1].lessons[0], level);
    expect(qs.filter((q) => q.type === 'word').length).toBe(4);
    expect(qs.filter((q) => q.type === 'word-back').length).toBe(4);
    expect(qs.find((q) => q.prompt === '会う')).toMatchObject({ answer: 'to meet', hint: 'あう' });
  });
  it('practice mixes the questions of the chosen levels only', () => {
    const qs = practiceQuestions(learn, 'N4', 'N4', { n: 10, random: () => 0.5 });
    expect(qs.length).toBeGreaterThan(0);
    expect(qs.every((q) => q.lesson === 'kara')).toBe(true);
    expect(practiceQuestions(learn, 'N5', 'N4', { n: 50 }).some((q) => q.lesson === 'kara')).toBe(true);
  });
});
