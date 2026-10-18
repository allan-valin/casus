import { describe, it, expect } from 'vitest';
import { getLanguage } from '../../src/lang/registry.js';
import { createState } from '../../src/lib/state.js';
import { makeColors } from '../../src/app/lib/colors.js';

/* Japanese reader (overnight plan 2026-10-19). */
const ja = getLanguage('ja');
const W = (lemma, pos, extra = {}) => ({ lemma, pos, ...extra });
const LEX = {
  私: [W('私', 'pron', { reading: 'わたし' })], は: [W('は', 'particle'), W('歯', 'noun', { form: 'kana' })],
  学校: [W('学校', 'noun', { reading: 'がっこう' })], に: [W('に', 'particle')], 行きました: [W('行く', 'verb', { form: 'politepast', reading: 'いきました' })],
  行き: [W('行く', 'verb', { form: 'stem', reading: 'いき' })], ました: [W('ます', 'suffix')], 本: [W('本', 'noun', { reading: 'ほん' })],
  を: [W('を', 'particle')], 読みます: [W('読む', 'verb', { form: 'polite', reading: 'よみます' })], コーヒー: [W('コーヒー', 'noun')],
  が: [W('が', 'particle')], 好き: [W('好き', 'adj', { form: 'dict', reading: 'すき' })], です: [W('だ', 'verb', { form: 'polite' })],
  学: [W('学', 'noun', { reading: 'がく' })], 校: [W('校', 'noun', { reading: 'こう' })],
};
const lexicon = { lookupAll: async (keys) => new Map(keys.map((k) => [k, LEX[k] ?? []])) };
async function read(text) { const s = createState({ text, lexicon, lang: ja }); await s.load(); return s; }

describe('Japanese', () => {
  it('splits a sentence with no spaces into dictionary words, the fewest that cover it', async () => {
    const s = await read('私は学校に行きました。');
    expect(s.blocks().map((b) => b.token.surface)).toEqual(['私', 'は', '学校', 'に', '行きました']);
    expect(s.sentences()).toHaveLength(1);
  });
  it('a particle colours the word before it by its role, and the two are one chunk', async () => {
    const b = (await read('私は学校に行きました。')).blocks();
    expect(b[0].candidates.map((c) => c.analysis.case)).toEqual(['top']);
    expect(b[2].candidates.map((c) => c.analysis.case)).toEqual(['tgt']);
    expect(b[1].candidates.map((c) => c.analysis.pos)).toEqual(['particle']);            // は is not 歯 here
    expect(b[1].candidates[0].analysis.governs).toEqual(['top']);
    expect(b[1].candidates[0].links.some((l) => l.kind === 'expression' && l.contiguous && l.index === 0)).toBe(true);
  });
  it('furigana and romaji for every word; は the particle reads wa', async () => {
    const b = (await read('私は学校に行きました。')).blocks();
    expect(b[2].furi).toEqual([['学校', 'がっこう']]);
    expect(b[4].furi).toEqual([['行', 'い'], ['きました', null]]);
    expect(b.map((x) => x.roman)).toEqual(['watashi', 'wa', 'gakkō', 'ni', 'ikimashita']);
  });
  it('katakana gets hiragana over it; an unknown katakana run stays one word', async () => {
    const b = (await read('コーヒーが好きです。')).blocks();
    expect(b[0].furi).toEqual([['コーヒー', 'こーひー']]);
    expect(b[0].roman).toBe('kōhī');
    const u = (await read('パンを読みます。')).blocks();
    expect(u[0].token.surface).toBe('パン');
    expect(u[0].candidates).toEqual([]);
  });
  it('colours: subject, object, target… each its hue; a polite past verb says so', async () => {
    const colors = makeColors(ja.inventory);
    const layers = { nominal: true, verb: true, function: true };
    const b = (await read('私は本を読みます。')).blocks();
    expect(colors.blockStyle(b[2], layers).badge).toBe('Ob');
    expect(colors.blockStyle(b[3], layers).badge).toBe('Ob');                             // を takes its role's hue
    expect(colors.blockStyle(b[4], layers).badge).toBe('pol');
  });
});

describe('the speaker reads Japanese from its kana', () => {
  it('speakForm takes the reading from the dictionary form', () => {
    expect(ja.speakForm({ headword: '食べる', dict_form: '食べる (たべる)' })).toBe('たべる');
    expect(ja.speakForm({ headword: 'これ', dict_form: 'これ' })).toBe('これ');
  });
});

describe('a time word with no particle after it is the adverb (毎日 every day)', () => {
  it('毎日学校に行きます', async () => {
    LEX.毎日 = [W('毎日', 'noun', { reading: 'まいにち' }), W('毎日', 'adv', { reading: 'まいにち' })];
    LEX.行きます = [W('行く', 'verb', { form: 'polite', reading: 'いきます' })];
    const b = (await read('毎日学校に行きます。')).blocks();
    expect(b[0].candidates.map((c) => c.analysis.pos)).toEqual(['adv']);
  });
});
