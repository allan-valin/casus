import { describe, it, expect } from 'vitest';
import { sentencePool, meaningQuestion, dictationDiff } from '../../src/app/lib/listen.js';

const lessons = [
  { examples: [{ text: 'Je mange.', en: 'I eat.', pt: 'Eu como.' }], more: [{ text: "J'ai applaudi.", en: 'I clapped.', pt: 'Eu aplaudi.' }, { text: 'Je mange.', en: 'I eat.' }] },
  { more: [{ text: 'Il pleut.', en: 'It is raining.' }, { text: 'Nous partons demain matin.', en: 'We leave tomorrow morning.' }, { text: 'x', en: '' }] },
];
const lang = { script: { strip: (s) => s.normalize('NFD').replace(/\p{M}/gu, '') } };

describe('listening and dictation (drills research 2026-10-20, items 7 and 9)', () => {
  it('pools every lesson sentence that has a meaning, once each', () => {
    expect(sentencePool(lessons).map((s) => s.text)).toEqual(['Je mange.', "J'ai applaudi.", 'Il pleut.', 'Nous partons demain matin.']);
  });
  it('a meaning question offers the right meaning among up to four, in the page language when there is one', () => {
    const pool = sentencePool(lessons);
    const q = meaningQuestion(pool, 0, 'pt', () => 0.5);
    expect(q.text).toBe('Je mange.');
    expect(q.answer).toBe('Eu como.');
    expect(q.options).toHaveLength(4);
    expect(q.options).toContain('Eu como.');
    expect(new Set(q.options).size).toBe(4);
  });
  it('dictation marks each word of the sentence: right, right but for accents, or missed', () => {
    const d = dictationDiff("J'ai applaudi.", "j'ai applaudi", lang);
    expect(d.ok).toBe(true);
    const e = dictationDiff('Nous partons demain matin.', 'nous partont matin', lang);
    expect(e.ok).toBe(false);
    expect(e.words.map((w) => [w.w, w.ok])).toEqual([['Nous', true], ['partons', false], ['demain', false], ['matin', true]]);
    const f = dictationDiff('Él está aquí.', 'el esta aqui', lang);
    expect(f.ok).toBe(true);
    expect(f.exact).toBe(false);
  });
});
