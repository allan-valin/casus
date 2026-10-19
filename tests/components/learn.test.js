// @vitest-environment jsdom
import { describe, it, expect } from 'vitest';
import { render, fireEvent } from '@testing-library/svelte';
import { tick } from 'svelte';
import Learn from '../../src/app/components/Learn.svelte';
import { getLanguage } from '../../src/lang/registry.js';
import { langFromPath, learnPath } from '../../src/app/lib/route.js';
import { SITES, siteLanguages } from '../../src/sites.js';

const flush = async () => { for (let i = 0; i < 10; i += 1) { await tick(); await new Promise((r) => setTimeout(r, 0)); } };
const store = () => { const m = new Map(); return { getItem: (k) => m.get(k) ?? null, setItem: (k, v) => m.set(k, String(v)), m }; };
const INDEX = { system: 'JLPT', credit: 'Grammar: JLPT Grammar Enhanced, CC BY-SA 4.0.', levels: [
  { id: 'N5', topics: [
    { id: 't1', kind: 'grammar', title: 'Saying what something is', lessons: [{ id: 'n5-004', title: 'は', meaning: 'as for; topic' }, { id: 'n5-005', title: 'も', meaning: 'also; too' }] },
    { id: 'w', kind: 'vocab', title: 'Words', lessons: [{ id: 'n5-v1', title: '会う · 青 …', meaning: '2 words' }] }] },
  { id: 'N4', topics: [{ id: 't2', kind: 'grammar', title: 'Conditions', lessons: [{ id: 'n4-001', title: '～ば', meaning: 'if' }] }] }] };
const LESSONS = {
  'n5-004': { id: 'n5-004', title: 'は', meaning: 'as for; topic', level: 'N5', topic: 'Saying what something is', intro: '<p>は marks the topic.</p>',
    sections: [{ id: 'formation', title: 'Formation', html: '<table><tr><td>Noun + は</td></tr></table>' }, { id: 'examples', title: 'Examples', html: '<div class="ex"><p class="ja"><ruby>私<rt>わたし</rt></ruby>は学生です。</p><p class="en">I am a student.</p></div>' },
      { id: 'mistakes', title: 'Common mistakes', html: '<ul><li>❌ …</li></ul>' }],
    examples: [{ furi: [['私', 'わたし'], ['は', null], ['学生', 'がくせい'], ['です。', null]], en: 'I am a student.', target: 'は', kana: 'わたしはがくせいです。', text: '私は学生です。', roman: 'watashi wa gakusei desu' }],
    practice: [{ q: '<p>私＿＿学生です。</p>', a: '<p>私<b>は</b>学生です。</p>' }], source: 'JLPT Grammar Enhanced (CC BY-SA 4.0)' },
  'n5-v1': { id: 'n5-v1', kind: 'vocab', words: [{ w: '会う', reading: 'あう', en: 'to meet' }, { w: '青', reading: 'あお', en: 'blue' }], source: 'OpenJLPT' },
};
const QS = { 'n5-004': { pools: { gap: ['が', 'を', 'に'] }, qs: [
  { type: 'gap', furi: [['私', 'わたし'], ['＿＿', null], ['学生', 'がくせい'], ['です。', null]], answer: 'は', en: 'I am a student.' },
  { type: 'translate', furi: [['猫', 'ねこ'], ['は好きです。', null]], roman: 'neko wa suki desu', tok: ['猫', 'は', '好き', 'です', '。'], answer: 'I like cats.' },
  { type: 'translate', furi: [['雨', 'あめ'], ['は嫌いです。', null]], roman: 'ame wa kirai desu', tok: ['雨', 'は', '嫌い', 'です', '。'], answer: 'I dislike rain.' }] } };
const props = (extra = {}) => ({ lang: getLanguage('ja'), storage: store(), loadLearn: async () => INDEX, loadLesson: async (id) => LESSONS[id], loadQuestions: async (id) => QS[id] ?? { qs: [] }, random: () => 0, ...extra });

describe('Learn tab, second version (Allan, 2026-10-19: topics listed under each unit, real lessons, furigana, many exercises)', () => {
  it('lives at /<code>/learn/', () => {
    expect(langFromPath('/casus-asia/ja/learn/', '/casus-asia/', siteLanguages(SITES.asia))).toEqual({ code: 'ja', view: 'learn' });
    expect(learnPath({ path: '/ja/' })).toBe('/ja/learn/');
  });
  it('a level shows its topics, each with its lessons listed below it', async () => {
    const { container } = render(Learn, props());
    await flush();
    expect([...container.querySelectorAll('.level-tab')].map((b) => b.dataset.level)).toEqual(['N5', 'N4']);
    const topics = [...container.querySelectorAll('.topic')];
    expect(topics.map((t) => t.querySelector('.topic-title').textContent.trim())).toEqual(['Saying what something is', 'Words']);
    expect([...topics[0].querySelectorAll('.lesson-row .l-title')].map((x) => x.textContent)).toEqual(['は', 'も']);
    expect(topics[0].querySelector('.lesson-row .l-meaning').textContent).toBe('as for; topic');
  });
  it('a lesson is a page: intro, sections with a contents bar, examples with furigana and romaji, the book’s practice with answers to reveal', async () => {
    const { container } = render(Learn, props());
    await flush();
    await fireEvent.click(container.querySelector('.lesson-row[data-lesson="n5-004"]'));
    await flush();
    const page = container.querySelector('.lesson-page');
    expect(page.querySelector('h3').textContent).toContain('は');
    expect([...page.querySelectorAll('.toc a')].map((a) => a.textContent)).toEqual(['Formation', 'Examples', 'Common mistakes', 'Your turn', 'Exercises']);
    expect(page.querySelector('.examples-romaji').textContent).toContain('watashi wa gakusei desu');
    const turn = page.querySelector('.your-turn details');
    expect(turn.querySelector('summary')).not.toBe(null);
    expect(page.querySelector('.next-lesson').dataset.lesson).toBe('n5-005');
  });
  it('exercises: furigana and romaji on the prompt; many questions; word order can be built by tapping', async () => {
    const storage = store();
    const { container } = render(Learn, props({ storage }));
    await flush();
    await fireEvent.click(container.querySelector('.lesson-row[data-lesson="n5-004"]'));
    await flush();
    await fireEvent.click(container.querySelector('button.start-exercises'));
    await flush();
    expect(container.querySelector('.ex-count').textContent).toMatch(/\d+/);
    const prompt = container.querySelector('.quiz-prompt');
    expect(prompt.querySelector('ruby rt')).not.toBe(null);
    await fireEvent.click(container.querySelector('.choice'));
    await flush();
    expect(JSON.parse(storage.getItem('casus:learn:ja'))['n5-004'].total).toBe(1);
  });
  it('the practice section mixes the lessons of a range of levels', async () => {
    const { container } = render(Learn, props());
    await flush();
    await fireEvent.click(container.querySelector('.mode-tab[data-mode="practice"]'));
    await flush();
    const [from, to] = container.querySelectorAll('select.range');
    await fireEvent.change(from, { target: { value: 'N5' } });
    await fireEvent.change(to, { target: { value: 'N5' } });
    await fireEvent.click(container.querySelector('button.start-practice'));
    await flush();
    expect(container.querySelector('.quiz-prompt')).not.toBe(null);
  });
});

describe('word order question', () => {
  it('tapping the words in order answers it', async () => {
    const ChoiceDrill = (await import('../../src/app/components/ChoiceDrill.svelte')).default;
    const items = [{ type: 'order', prompt: 'I like cats.', tokens: ['です', '猫', '。', 'は', '好き'], answer: '猫は好きです。' }];
    const { container } = render(ChoiceDrill, { items, random: () => 0 });
    await flush();
    for (const w of ['猫', 'は', '好き', 'です', '。']) await fireEvent.click([...container.querySelectorAll('.tile:not(:disabled)')].find((b) => b.textContent === w));
    await flush();
    expect(container.querySelector('.quiz-feedback').classList.contains('right')).toBe(true);
  });
});
