import { describe, it, expect } from 'vitest';
import { questionsFromFile } from '../../src/lib/learn/questions.js';

const FILE = {
  pools: { gap: ['が', 'を', 'に', 'で'] },
  qs: [
    { type: 'gap', furi: [['私', 'わたし'], ['＿＿', null], ['学生', 'がくせい'], ['です。', null]], answer: 'は', en: 'I am a student.' },
    { type: 'translate', furi: [['私', 'わたし'], ['は学生です。', null]], answer: 'I am a student.', tok: ['私', 'は', '学生', 'です', '。'], roman: 'watashi wa gakusei desu' },
    { type: 'translate', furi: [['雨', 'あめ'], ['は降る。', null]], answer: 'It rains.', tok: ['雨', 'は', '降る', '。'] },
    { type: 'translate', furi: [['猫', 'ねこ'], ['は好き。', null]], answer: 'I like cats.', tok: ['猫', 'は', '好き', '。'] },
    { type: 'meaning', prompt: 'は', answer: 'topic', pool: ['subject', 'object'] },
  ],
};

describe('a lesson’s question file becomes questions (Allan, 2026-10-19: hundreds per lesson)', () => {
  it('pools are stored once; each sentence also gives English → Japanese and word order', () => {
    const qs = questionsFromFile(FILE, { lesson: 'wa', random: () => 0 });
    expect(qs.find((q) => q.type === 'gap').pool).toEqual(['が', 'を', 'に', 'で']);
    const tr = qs.filter((q) => q.type === 'translate');
    expect(tr[0].pool).toEqual(['It rains.', 'I like cats.']);
    const back = qs.filter((q) => q.type === 'back');
    expect(back.length).toBe(3);
    expect(back[0]).toMatchObject({ prompt: 'I am a student.', answer: '私は学生です。' });
    expect(back[0].pool).toEqual(['雨は降る。', '猫は好き。']);
    const order = qs.filter((q) => q.type === 'order');
    expect(order.length).toBe(3);
    expect(order[0].tokens.slice().sort()).toEqual(['。', 'です', '学生', '私', 'は'].sort());
    expect(order[0].answer).toBe('私は学生です。');
    expect(qs.every((q) => q.lesson === 'wa')).toBe(true);
    expect(qs.find((q) => q.type === 'meaning').pool).toEqual(['subject', 'object']);
  });
});

describe('translations in the interface language', () => {
  it('Portuguese interface: a sentence with a Portuguese translation is asked in Portuguese, among Portuguese ones', () => {
    const file = { qs: [
      { type: 'translate', furi: [['Тој е тука.', null]], answer: 'He is here.', pt: 'Ele está aqui.' },
      { type: 'translate', furi: [['Јас сум тука.', null]], answer: 'I am here.', pt: 'Eu estou aqui.' },
      { type: 'translate', furi: [['Таа спие.', null]], answer: 'She sleeps.' },
    ] };
    const qs = questionsFromFile(file, { lesson: 'x', ui: 'pt', random: () => 0 }).filter((q) => q.type === 'translate');
    expect(qs[0].answer).toBe('Ele está aqui.');
    expect(qs[0].pool).toEqual(['Eu estou aqui.']);
    expect(qs[2].answer).toBe('She sleeps.');
    const back = questionsFromFile(file, { lesson: 'x', ui: 'pt', random: () => 0 }).find((q) => q.type === 'back');
    expect(back.prompt).toBe('Ele está aqui.');
  });
});

describe('gap choices follow the answer’s capital letter (mk browser check, 2026-10-19)', () => {
  it('Ја at the start: wrong answers capitalised, no ја beside Ја', () => {
    const file = { pools: { gap: ['го', 'ја', 'ги', 'му'] }, qs: [{ type: 'gap', furi: [['＿＿ изгубив торбата.', null]], answer: 'Ја', en: 'I lost the bag.' }] };
    const [q] = questionsFromFile(file, { lesson: 'x' });
    expect(q.pool).toEqual(['Го', 'Ги', 'Му']);
  });
});
