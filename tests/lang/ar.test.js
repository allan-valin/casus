import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { stripAr } from '../../src/lang/ar/normalize.js';
import { romanizeAr } from '../../src/lang/ar/romanize.js';
import { getLanguage } from '../../src/lang/registry.js';
import { createState } from '../../src/lib/state.js';

describe('Arabic keys', () => {
  it('the page strips exactly as the build does', () => {
    for (const [w, s] of Object.entries(JSON.parse(readFileSync('tests/fixtures/ar.strip.json', 'utf8')))) expect(stripAr(w)).toBe(s);
  });
});

describe('Arabic romanisation (as Wiktionary writes it)', () => {
  it.each([
    ['كِتَاب', 'kitāb'], ['الْكِتَابُ', 'al-kitābu'], ['الشَّمْس', 'aš-šams'], ['مُدَرِّسَة', 'mudarrisa'], ['كَتَبَ', 'kataba'],
    ['يَكْتُبُ', 'yaktubu'], ['بَيْت', 'bayt'], ['كِتَابًا', 'kitāban'], ['قُرْآن', 'qurʔān'], ['خُبْز', 'ḵubz'], ['عَرَبِيّ', 'ʕarabiyy'],
    ['اِشْتَرَيْت', 'ištarayt'], ['اُكْتُبْ', 'uktub'],   // an initial alif with a vowel is that vowel (hamzat al-waṣl)
  ])('%s → %s', (a, r) => expect(romanizeAr(a)).toBe(r));
});

const ar = getLanguage('ar');
const N = (lemma, c, n, g, state, extra = {}) => ({ lemma, pos: 'noun', case: c, number: n, gender: g, state, ...extra });
const LEX = {
  'الْكِتَابُ': [N('k', 'nom', 'sg', 'm', 'def')], 'الْكِتَابِ': [N('k', 'gen', 'sg', 'm', 'def')], 'الْكِتَابَ': [N('k', 'acc', 'sg', 'm', 'def')],
  'فِي': [{ lemma: 'fi', pos: 'prep' }], 'و': [{ lemma: 'wa', pos: 'conj' }],
  'الْبَيْتِ': [N('b', 'gen', 'sg', 'm', 'def')], 'الْبَيْتُ': [N('b', 'nom', 'sg', 'm', 'def')], 'الْبَيْتَ': [N('b', 'acc', 'sg', 'm', 'def')],
};
const marked = Object.keys(LEX);
const lexicon = { lookupAll: async (keys) => new Map(keys.map((k) => [k, marked.filter((m) => stripAr(m) === stripAr(k)).flatMap((m) => LEX[m].map((a) => (m === k ? a : { ...a, marked: m })))])) };
async function read(text) { const s = createState({ text, lexicon, lang: ar }); await s.load(); return s.blocks(); }

describe('Arabic reader', () => {
  it('a preposition governs the genitive: في البيت', async () => {
    const b = await read('في البيت.');
    expect(b.map((x) => x.token.surface)).toEqual(['في', 'البيت']);
    expect(b[1].candidates.map((c) => c.analysis.case)).toEqual(['gen']);
  });
  it('the proclitic و (and) is its own block: والكتاب', async () => {
    const b = await read('والكتاب.');
    expect(b.map((x) => x.token.surface)).toEqual(['و', 'الكتاب']);
    expect(b[0].candidates[0].analysis.pos).toBe('conj');
  });
  it('right to left', () => expect(ar.script.rtl).toBe(true));
});

describe('Arabic sentence rules', () => {
  const L2 = {
    'قَرَأَ': [{ lemma: 'q', pos: 'verb', person: '3', number: 'sg', gender: 'm', tense: 'past', mood: 'ind', voice: 'act' }],
    'الطَّالِبُ': [N('t', 'nom', 'sg', 'm', 'def')], 'الطَّالِبَ': [N('t', 'acc', 'sg', 'm', 'def')], 'الطَّالِبِ': [N('t', 'gen', 'sg', 'm', 'def')],
    'الْكِتَابُ': [N('k', 'nom', 'sg', 'm', 'def')], 'الْكِتَابَ': [N('k', 'acc', 'sg', 'm', 'def')], 'الْكِتَابِ': [N('k', 'gen', 'sg', 'm', 'def')],
    'إِلَى': [{ lemma: 'ila', pos: 'prep' }], 'إِلًى': [N('ila2', 'nom', 'sg', 'm', 'indef'), N('ila2', 'gen', 'sg', 'm', 'indef')],
    'الْبَيْتِ': [N('b', 'gen', 'sg', 'm', 'def')], 'الْبَيْتُ': [N('b', 'nom', 'sg', 'm', 'def')],
  };
  const m2 = Object.keys(L2);
  const lx = { lookupAll: async (keys) => new Map(keys.map((k) => [k, m2.filter((m) => stripAr(m) === stripAr(k)).flatMap((m) => L2[m].map((a) => ({ ...a, marked: m })))])) };
  const read2 = async (t) => { const s = createState({ text: t, lexicon: lx, lang: ar }); await s.load(); return s.blocks(); };
  const C = (b) => [...new Set(b.candidates.map((c) => c.analysis.case))];
  it('verb – subject – object: قرأ الطالب الكتاب', async () => {
    const b = await read2('قرأ الطالب الكتاب.');
    expect(C(b[1])).toEqual(['nom']);
    expect(C(b[2])).toEqual(['acc']);
    expect(b[1].candidates[0].reasons.join(' ')).toMatch(/subject/);
  });
  it('a preposition that has taken its object is the preposition: إلى البيت', async () => {
    const b = await read2('إلى البيت.');
    expect(b[0].candidates.map((c) => c.analysis.pos)).toEqual(['prep']);
  });
});

describe('Arabic agreement: the adjective follows its noun', () => {
  const A = (c, n, g, s) => ({ lemma: 'j', pos: 'adj', case: c, number: n, gender: g, state: s });
  const L3 = {
    'قَرَأَ': [{ lemma: 'q', pos: 'verb', person: '3', number: 'sg', gender: 'm', tense: 'past', mood: 'ind', voice: 'act' }],
    'الطَّالِبُ': [N('t', 'nom', 'sg', 'm', 'def')], 'الطَّالِبَ': [N('t', 'acc', 'sg', 'm', 'def')],
    'الْكِتَابُ': [N('k', 'nom', 'sg', 'm', 'def')], 'الْكِتَابَ': [N('k', 'acc', 'sg', 'm', 'def')], 'الْكُتَّابَ': [N('w', 'acc', 'pl', 'm', 'def')],
    'الْجَدِيدُ': [A('nom', 'sg', 'm', 'def')], 'الْجَدِيدَ': [A('acc', 'sg', 'm', 'def')],
  };
  const m3 = Object.keys(L3);
  const lx = { lookupAll: async (keys) => new Map(keys.map((k) => [k, m3.filter((m) => stripAr(m) === stripAr(k)).flatMap((m) => L3[m].map((a) => ({ ...a, marked: m })))])) };
  it('قرأ الطالب الكتاب الجديد: الجديد is accusative like الكتاب, and الكتاب singular like الجديد', async () => {
    const s = createState({ text: 'قرأ الطالب الكتاب الجديد.', lexicon: lx, lang: ar });
    await s.load();
    const b = s.blocks();
    expect(b[3].candidates.map((c) => c.analysis.case)).toEqual(['acc']);
    expect(b[2].candidates.map((c) => c.analysis.number)).toEqual(['sg']);
  });
});

describe('agreement narrows, it does not erase other parts of speech (Learn check, 2026-10-19: أنا أحب الشاي)', () => {
  const LEX2 = {
    'أَنَا': [{ lemma: 'ana', pos: 'pron', case: 'x', number: 'x', gender: 'x', state: 'x' }],
    'أَنًّا': [N('ann', 'acc', 'sg', 'm', 'indef')],
    'أُحِبُّ': [{ lemma: 'ahabba', pos: 'verb', person: '1', number: 'sg', gender: 'm', tense: 'npast', mood: 'ind', voice: 'act' }],
    'أَحَبَّ': [{ lemma: 'ahabb', pos: 'adj', case: 'acc', number: 'sg', gender: 'm', state: 'indef' }],
  };
  const marked2 = Object.keys(LEX2);
  const lex2 = { lookupAll: async (keys) => new Map(keys.map((k) => [k, marked2.filter((m) => stripAr(m) === stripAr(k)).flatMap((m) => LEX2[m].map((a) => ({ ...a, marked: m })))])) };
  it('the pronoun and the verb readings stay', async () => {
    const s = createState({ text: 'أنا أحب', lexicon: lex2, lang: ar });
    await s.load();
    const b = s.blocks();
    expect(b[0].candidates.map((c) => c.analysis.pos)).toContain('pron');
    expect(b[1].candidates.map((c) => c.analysis.pos)).toContain('verb');
  });
});
