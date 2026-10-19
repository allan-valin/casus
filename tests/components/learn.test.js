// @vitest-environment jsdom
import { describe, it, expect } from 'vitest';
import { render, fireEvent } from '@testing-library/svelte';
import { tick } from 'svelte';
import Learn from '../../src/app/components/Learn.svelte';
import { getLanguage } from '../../src/lang/registry.js';
import { langFromPath, learnPath } from '../../src/app/lib/route.js';
import { SITES, siteLanguages } from '../../src/sites.js';

const flush = async () => { for (let i = 0; i < 8; i += 1) { await tick(); await new Promise((r) => setTimeout(r, 0)); } };
const store = () => { const m = new Map(); return { getItem: (k) => m.get(k) ?? null, setItem: (k, v) => m.set(k, String(v)), m }; };
const g = (id, pattern, meaning, text, en) => ({ id, kind: 'grammar', pattern, romaji: id, meaning: { en: meaning }, formation: `Noun + ${pattern}`, examples: [{ text, en }], notes: { en: `about ${id}` }, source: 'OpenJLPT' });
const LEARN = { system: 'JLPT', credit: 'OpenJLPT, CC BY-SA 4.0', levels: [
  { id: 'N5', units: [{ id: 'u1', kind: 'grammar', n: 1, title: '〜は · 〜が', lessons: [g('wa', '〜は', 'topic', '私は学生です。', 'I am a student.'), g('ga', '〜が', 'subject', '雨が降る。', 'It rains.'), g('o', '〜を', 'object', 'パンを食べる。', 'I eat bread.')] },
    { id: 'v1', kind: 'vocab', n: 1, title: '会う …', lessons: [{ id: 'v1', kind: 'vocab', words: [{ w: '会う', reading: 'あう', en: 'to meet' }, { w: '青', reading: 'あお', en: 'blue' }] }] }] },
  { id: 'N4', units: [{ id: 'u2', kind: 'grammar', n: 1, title: '〜から', lessons: [g('kara', '〜から', 'because', '雨だから。', 'Because it rains.')] }] }] };

describe('Learn tab (Allan, 2026-10-19)', () => {
  it('lives at /<code>/learn/', () => {
    expect(langFromPath('/casus-asia/ja/learn/', '/casus-asia/', siteLanguages(SITES.asia))).toEqual({ code: 'ja', view: 'learn' });
    expect(learnPath({ path: '/ja/' })).toBe('/ja/learn/');
  });
  it('levels as tabs, units with their lessons; a lesson shows its pattern, meaning, formation, examples, notes and source', async () => {
    const { container } = render(Learn, { lang: getLanguage('ja'), loadLearn: async () => LEARN, storage: store() });
    await flush();
    expect([...container.querySelectorAll('.level-tab')].map((b) => b.textContent.trim())).toEqual(['N5', 'N4']);
    expect(container.querySelectorAll('.unit').length).toBe(2);
    await fireEvent.click(container.querySelector('.lesson-link[data-lesson="wa"]'));
    await flush();
    const lesson = container.querySelector('.lesson');
    expect(lesson.querySelector('.pattern').textContent).toBe('〜は');
    expect(lesson.textContent).toContain('topic');
    expect(lesson.textContent).toContain('Noun + 〜は');
    expect(lesson.textContent).toContain('私は学生です。');
    expect(lesson.textContent).toContain('about wa');
    expect(lesson.textContent).toContain('OpenJLPT');
  });
  it('a lesson’s practice asks its questions and keeps its progress', async () => {
    const storage = store();
    const { container } = render(Learn, { lang: getLanguage('ja'), loadLearn: async () => LEARN, storage, random: () => 0 });
    await flush();
    await fireEvent.click(container.querySelector('.lesson-link[data-lesson="wa"]'));
    await flush();
    await fireEvent.click(container.querySelector('button.practice-lesson'));
    await flush();
    const prompt = container.querySelector('.quiz-prompt').textContent;
    expect(['〜は', '私＿＿学生です。', '私は学生です。']).toContain(prompt);
    await fireEvent.click(container.querySelector('.choice'));
    await flush();
    expect(JSON.parse(storage.getItem('casus:learn:ja')).wa.total).toBe(1);
  });
  it('the practice section takes a range of levels', async () => {
    const { container } = render(Learn, { lang: getLanguage('ja'), loadLearn: async () => LEARN, storage: store(), random: () => 0 });
    await flush();
    await fireEvent.click(container.querySelector('.mode-tab[data-mode="practice"]'));
    await flush();
    const [from, to] = container.querySelectorAll('select.range');
    await fireEvent.change(from, { target: { value: 'N4' } });
    await fireEvent.change(to, { target: { value: 'N4' } });
    await fireEvent.click(container.querySelector('button.start-practice'));
    await flush();
    expect(['〜から', '雨だ＿＿。', '雨だから。']).toContain(container.querySelector('.quiz-prompt').textContent);
  });
});
