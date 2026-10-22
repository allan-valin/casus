// @vitest-environment jsdom
import { describe, it, expect, vi } from 'vitest';
import { render, fireEvent } from '@testing-library/svelte';
import { tick } from 'svelte';
import Drills from '../../src/app/components/Drills.svelte';
import { getLanguage } from '../../src/lang/registry.js';

/* Allan, 2026-10-18: "letter drill" becomes "drills": pick the language there, then its drills; Latin and German
 * get grammar drills for noun and verb endings. */
const rosa = { id: '1', headword: 'rosa', dict_form: 'rosa, -ae f.', pos: 'noun', gloss: 'rose', rows: [['rosa', 'nnsf', 'nvsf', 'nbsf'], [4, 'e', 'ngsf', 'ndsf', 'nnpf', 'nvpf'], [4, 'm', 'nasf']] };
const amo = { id: '2', headword: 'amo', dict_form: 'amo, -are', pos: 'verb', gloss: 'love', rows: [['amo', 'v1spia1'], [2, 'as', 'v2spia1'], [2, 'at', 'v3spia1']] };
const FREQ = Array.from({ length: 300 }, (_, i) => ({ w: `w${i + 1}`, en: `m${i + 1}`, pos: 'noun', rank: i + 1 }));
const PHRASES = [
  { p: 'vox clandestina', kind: 'idiom', en: 'a whisper', lit: [['vox', 'voice'], ['clandestina', 'secret']] },
  { p: 'in vino veritas', kind: 'proverb', en: 'in wine, truth', lit: [['in', 'in'], ['vino', 'wine'], ['veritas', 'truth']] },
  { p: 'mea culpa', kind: 'phrase', en: 'through my fault', lit: [['mea', 'my'], ['culpa', 'fault']] },
  { p: 'ad astra', kind: 'idiom', en: 'to the stars', lit: [['ad', 'to'], ['astra', 'star']] },
  { p: 'suum cuique', kind: 'idiom', en: 'to each his own', lit: [['suum', 'his own'], ['cuique', 'each']] },
];
const DATA = { drills: [rosa, amo], frequency: FREQ, phrases: PHRASES };
const loadData = async (name) => DATA[name] ?? [];
const tick2 = async () => { await tick(); await new Promise((r) => setTimeout(r, 0)); await tick(); };

describe('Drills page', () => {
  it('has no language dropdown: the language nav already picks it (Allan, 2026-10-22)', () => {
    const { container } = render(Drills, { lang: getLanguage('la'), loadData, navigate: vi.fn() });
    expect(container.querySelector('select.drill-language')).toBe(null);
  });
  it('the drill types sit under one button that shows the current drill (Allan, 2026-10-22: saves space on a phone)', async () => {
    const { container } = render(Drills, { lang: getLanguage('la'), loadData, navigate: vi.fn() });
    await tick2();
    const picker = container.querySelector('details.picker.drill-picker');
    expect(picker).not.toBe(null);
    expect(picker.open).toBe(false);
    expect(picker.querySelectorAll('.drill-tab').length).toBe(container.querySelectorAll('.drill-tab').length);
    expect(picker.querySelector('summary').textContent).toMatch(/noun/i);
    picker.open = true;
    await fireEvent.click(picker.querySelector('.drill-tab[data-drill="words"]'));
    await tick2();
    expect(picker.open).toBe(false);
    expect(picker.querySelector('summary').textContent).toMatch(/word/i);
  });
  it('Latin has noun and verb drills but no letters; Greek has letters too', async () => {
    const la = render(Drills, { lang: getLanguage('la'), loadData, navigate: () => {} });
    expect([...la.container.querySelectorAll('.drill-tab')].map((b) => b.dataset.drill)).toEqual(['nouns', 'verbs', 'parse', 'transform', 'agree', 'cloze', 'spot', 'who', 'words', 'match', 'phrases', 'listen', 'review']);
    const grc = render(Drills, { lang: getLanguage('grc'), loadData, navigate: () => {} });
    expect([...grc.container.querySelectorAll('.drill-tab')].map((b) => b.dataset.drill)).toEqual(['letters', 'nouns', 'verbs', 'parse', 'transform', 'agree', 'cloze', 'spot', 'who', 'words', 'match', 'phrases', 'listen', 'review']);
  });
  it('Portuguese has no noun cases, so verb endings only', () => {
    const pt = render(Drills, { lang: getLanguage('pt'), loadData, navigate: () => {} });
    expect([...pt.container.querySelectorAll('.drill-tab')].map((b) => b.dataset.drill)).toEqual(['verbs', 'parse', 'transform', 'cloze', 'spot', 'who', 'words', 'match', 'phrases', 'listen', 'review']);
  });
  it('the noun drill shows the table blank; a right answer turns its cell right', async () => {
    const { container } = render(Drills, { lang: getLanguage('la'), loadData, navigate: () => {}, random: () => 0 });
    await tick2();
    expect(container.querySelector('.drill-word').textContent).toMatch(/rosa, -ae f\./);
    const gen = container.querySelector('input[data-cell="gen|sg"]');
    await fireEvent.input(gen, { target: { value: 'rosae' } });
    await fireEvent.keyDown(gen, { key: 'Enter' });
    await tick();
    expect(container.querySelector('[data-cell-box="gen|sg"]').classList.contains('right')).toBe(true);
  });
  it('the verb tab drills the verb', async () => {
    const { container } = render(Drills, { lang: getLanguage('la'), loadData, navigate: () => {}, random: () => 0 });
    await tick2();
    await fireEvent.click(container.querySelector('.drill-tab[data-drill="verbs"]'));
    await tick2();
    expect(container.querySelector('.drill-word').textContent).toMatch(/amo/);
    expect(container.querySelector('input[data-cell="3|sg"]')).not.toBe(null);
  });
});

describe('cheat sheet (Allan, 2026-10-18: a button near the top for all tables)', () => {
  it('nouns: every model word’s table, open', async () => {
    const { container } = render(Drills, { lang: getLanguage('la'), loadData, navigate: () => {} });
    await tick2();
    await fireEvent.click(container.querySelector('button.cheatsheet'));
    await tick();
    const sheet = document.querySelector('.cheat');
    expect(sheet.textContent).toMatch(/rosa, -ae f\./);
    expect(sheet.textContent).not.toMatch(/amo/);
    expect(sheet.querySelector('td[data-cell="gen|sg"]').textContent).toBe('rosae');
  });
  it('letters: the whole alphabet with names and sounds', async () => {
    const { container } = render(Drills, { lang: getLanguage('grc'), loadData, navigate: () => {} });
    await tick2();
    await fireEvent.click(container.querySelector('button.cheatsheet'));
    await tick();
    const rows = [...document.querySelectorAll('.cheat tr.letter')];
    expect(rows.length).toBeGreaterThanOrEqual(24);
    expect(rows[0].textContent).toMatch(/α.*Α.*alpha.*a/s);
  });
});

describe('frequent words and phrases (Allan, 2026-10-18)', () => {
  it('words: the 1–200 range by default, four meanings to choose from; a right choice says so', async () => {
    const { container } = render(Drills, { lang: getLanguage('la'), loadData, navigate: () => {}, random: () => 0 });
    await tick2();
    await fireEvent.click(container.querySelector('.drill-tab[data-drill="words"]'));
    await tick2();
    expect(container.querySelector('select.word-range').value).toBe('1-200');
    const prompt = container.querySelector('.quiz-prompt').textContent.trim();
    expect(Number(prompt.slice(1))).toBeLessThanOrEqual(200);
    const choices = [...container.querySelectorAll('button.choice')];
    expect(choices).toHaveLength(4);
    await fireEvent.click(choices.find((b) => b.querySelector('.text').textContent.trim() === `m${prompt.slice(1)}`));
    await tick();
    expect(container.querySelector('.quiz-feedback').classList.contains('right')).toBe(true);
  });
  it('phrases: after answering, the word-by-word reading shows how the words differ from the meaning', async () => {
    const { container } = render(Drills, { lang: getLanguage('la'), loadData, navigate: () => {}, random: () => 0 });
    await tick2();
    await fireEvent.click(container.querySelector('.drill-tab[data-drill="phrases"]'));
    await tick2();
    await fireEvent.click(container.querySelector('button.choice'));
    await tick();
    expect(container.querySelectorAll('.literal .lit-word').length).toBeGreaterThan(1);
  });
  it('phrases: a kind filter (idioms only)', async () => {
    const { container } = render(Drills, { lang: getLanguage('la'), loadData, navigate: () => {}, random: () => 0 });
    await tick2();
    await fireEvent.click(container.querySelector('.drill-tab[data-drill="phrases"]'));
    await tick2();
    const kind = container.querySelector('select.phrase-kind');
    await fireEvent.change(kind, { target: { value: 'idiom' } });
    await tick2();
    expect(['vox clandestina', 'ad astra', 'suum cuique']).toContain(container.querySelector('.quiz-prompt').textContent.trim());
  });
  it('the cheat sheet of the words drill lists the range with meanings', async () => {
    const { container } = render(Drills, { lang: getLanguage('la'), loadData, navigate: () => {} });
    await tick2();
    await fireEvent.click(container.querySelector('.drill-tab[data-drill="words"]'));
    await tick2();
    await fireEvent.click(container.querySelector('button.cheatsheet'));
    await tick();
    expect(document.querySelectorAll('.cheat tr.word').length).toBe(200);
  });
  it('the cheat sheet has a menu of every drill; it opens on the current one and moves to any other', async () => {
    const { container } = render(Drills, { lang: getLanguage('la'), loadData, navigate: () => {} });
    await tick2();
    await fireEvent.click(container.querySelector('button.cheatsheet'));
    await tick();
    const sheet = () => [...document.querySelectorAll('.cheat')].at(-1);
    const menu = [...sheet().querySelectorAll('.cheat-tab')].map((b) => b.dataset.section);
    expect(menu).toEqual(['nouns', 'verbs', 'parse', 'transform', 'cloze', 'spot', 'who', 'words', 'match', 'phrases', 'listen', 'review']);
    expect(sheet().querySelector('.cheat-tab.active').dataset.section).toBe('nouns');
    await fireEvent.click(sheet().querySelector('.cheat-tab[data-section="phrases"]'));
    await tick();
    expect(sheet().querySelectorAll('tr.phrase').length).toBe(5);
    await fireEvent.click(sheet().querySelector('.cheat-tab[data-section="verbs"]'));
    await tick();
    expect(sheet().querySelector('.model h4').textContent).toContain('amo');
  });
});

describe('random word of the same table (Allan, 2026-10-18)', () => {
  const terra = [['terra', 'nnsf', 'nvsf', 'nbsf'], [5, 'e', 'ngsf', 'ndsf', 'nnpf', 'nvpf'], [5, 'm', 'nasf']];
  const withPool = { ...rosa, pool: [['9', 'terra, -ae f.', 'earth']] };
  const sum = { id: '5', headword: 'sum', dict_form: 'sum, esse', pos: 'verb', gloss: 'to be', irregular: true, pool: [], rows: [['sum', 'v1spia5']] };
  const data = { drills: [withPool, sum], frequency: [], phrases: [] };
  const loadData2 = async (n) => data[n] ?? [];
  it('the button picks a dictionary word that follows the table and drills it', async () => {
    const loadParadigm = vi.fn(async (id) => (id === '9' ? terra : null));
    const { container } = render(Drills, { lang: getLanguage('la'), loadData: loadData2, loadParadigm, navigate: () => {}, random: () => 0 });
    await tick2();
    const btn = container.querySelector('button.random-word');
    expect(btn.textContent).toMatch(/random word/i);
    await fireEvent.click(btn);
    await tick2();
    expect(loadParadigm).toHaveBeenCalledWith('9');
    expect(container.querySelector('.drill-word').textContent).toMatch(/terra, -ae f\./);
    expect(container.querySelector('.drill-word').textContent).toMatch(/rosa/);             // "like rosa"
    const gen = container.querySelector('input[data-cell="gen|sg"]');
    await fireEvent.input(gen, { target: { value: 'terrae' } });
    await fireEvent.keyDown(gen, { key: 'Enter' });
    await tick();
    expect(container.querySelector('[data-cell-box="gen|sg"]').classList.contains('right')).toBe(true);
  });
  it('an irregular model offers no random word, and says why', async () => {
    const { container } = render(Drills, { lang: getLanguage('la'), loadData: loadData2, loadParadigm: async () => null, navigate: () => {}, random: () => 0 });
    await tick2();
    await fireEvent.click(container.querySelector('.drill-tab[data-drill="verbs"]'));
    await tick2();
    const btn = container.querySelector('button.random-word');
    expect(btn.disabled).toBe(true);
    expect(btn.title).toMatch(/irregular/i);
  });
});

describe('Japanese drills (overnight plan 2026-10-19)', () => {
  const words = [{ w: '会う', reading: 'あう', en: 'to meet', level: 'N5', rank: 1 }, { w: '青', reading: 'あお', en: 'blue', level: 'N5', rank: 2 },
    { w: '赤', reading: 'あか', en: 'red', level: 'N5', rank: 3 }, { w: '朝', reading: 'あさ', en: 'morning', level: 'N5', rank: 4 },
    { w: '味', reading: 'あじ', en: 'taste', level: 'N4', rank: 5 }];
  const loadJa = async (n) => ({ drills: [], frequency: words, phrases: [] }[n] ?? []);
  it('frequent words come by JLPT level, with romaji from the reading', async () => {
    const { container } = render(Drills, { lang: getLanguage('ja'), loadData: loadJa, navigate: () => {}, random: () => 0 });
    await tick2();
    await fireEvent.click(container.querySelector('.drill-tab[data-drill="words"]'));
    await tick2();
    expect([...container.querySelector('select.word-range').options].map((o) => o.value)).toEqual(['N5', 'N4']);
    const prompt = container.querySelector('.quiz-prompt').textContent.trim();
    const w = words.find((x) => x.w === prompt);
    expect(container.querySelector('.prompt-roman').textContent).toBe({ あう: 'au', あお: 'ao', あか: 'aka', あさ: 'asa' }[w.reading]);
  });
  it('the conjugation tabs are named for what Japanese conjugates', async () => {
    const { container } = render(Drills, { lang: getLanguage('ja'), loadData: loadJa, navigate: () => {} });
    await tick2();
    const tabs = Object.fromEntries([...container.querySelectorAll('.drill-tab')].map((b) => [b.dataset.drill, b.textContent.trim()]));
    expect(tabs.letters).toMatch(/kana/i);
    expect(tabs.nouns).toMatch(/adjective/i);
    expect(tabs.verbs).toMatch(/verb/i);
  });
});

describe('Parse the form (drills research 2026-10-20)', () => {
  it('shows a form of a model word and offers what it could be; a syncretic form never offers its other readings', async () => {
    const { container } = render(Drills, { lang: getLanguage('la'), loadData, navigate: () => {}, random: () => 0 });
    await tick2();
    await fireEvent.click(container.querySelector('.drill-tab[data-drill="parse"]'));
    await tick2();
    const prompt = container.querySelector('.quiz-prompt').textContent.trim();
    expect(['rosa', 'rosae', 'rosam', 'amo', 'amas', 'amat']).toContain(prompt);
    expect(container.querySelectorAll('.choice').length).toBeGreaterThanOrEqual(2);
  });
});

describe('Review tab (drills research 2026-10-20)', () => {
  it('asks the items that are due, and says when nothing is', async () => {
    const m = new Map(); const storage = { getItem: (k) => m.get(k) ?? null, setItem: (k, v) => m.set(k, String(v)) };
    const { createReview } = await import('../../src/app/lib/review.js');
    createReview('la', storage).record({ prompt: 'rosae', answer: 'gen sg', pool: ['acc sg', 'abl sg', 'dat pl'] }, false, 0);
    const { container } = render(Drills, { lang: getLanguage('la'), loadData, navigate: () => {}, storage, random: () => 0 });
    await tick2();
    await fireEvent.click(container.querySelector('.drill-tab[data-drill="review"]'));
    await tick2();
    expect(container.querySelector('.quiz-prompt').textContent).toContain('rosae');
    const empty = render(Drills, { lang: getLanguage('de'), loadData, navigate: () => {}, storage, random: () => 0 });
    await tick2();
    await fireEvent.click(empty.container.querySelector('.drill-tab[data-drill="review"]'));
    await tick2();
    expect(empty.container.querySelector('.review-empty')).not.toBe(null);
  });
});

describe('typed recall in the Words drill', () => {
  it('a third direction asks to type the word', async () => {
    const { container } = render(Drills, { lang: getLanguage('la'), loadData, navigate: () => {}, random: () => 0 });
    await tick2();
    await fireEvent.click(container.querySelector('.drill-tab[data-drill="words"]'));
    await tick2();
    await fireEvent.change(container.querySelector('select.word-direction'), { target: { value: 'typed' } });
    await tick2();
    expect(container.querySelector('input.type-answer')).not.toBe(null);
    expect(container.querySelector('.type-prompt').textContent).toMatch(/^m\d+$/);
  });
});


describe('Transform tab', () => {
  it('shows a form and a change, and takes a typed answer', async () => {
    const { container } = render(Drills, { lang: getLanguage('la'), loadData, navigate: () => {}, random: () => 0 });
    await tick2();
    await fireEvent.click(container.querySelector('.drill-tab[data-drill="transform"]'));
    await tick2();
    expect(container.querySelector('.type-prompt').textContent).toContain('→');
    expect(container.querySelector('input.type-answer')).not.toBe(null);
  });
});
