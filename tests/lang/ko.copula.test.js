import { describe, it, expect } from 'vitest';
import { splitWords } from '../../src/lang/ko/tokenize.js';
import { copulaStage, pronounStage } from '../../src/lang/ko/stages.js';

const WORDS = { 학생: [{ pos: 'noun' }], 그거: [{ pos: 'pron' }], 이에: [{ pos: 'adv' }], 요: [{ pos: 'particle' }] };
const lexicon = { lookupAll: async (keys) => new Map(keys.map((k) => [k, WORDS[k] ?? []])) };
const tok = (surface) => ({ surface, kind: 'word', key: surface, start: 0, end: surface.length, enclitic: null });
const B = (key, analyses, extra = {}) => ({ token: { key, surface: key, ...extra }, candidates: analyses.map((a) => ({ analysis: a, reasons: [], links: [] })), pinned: null });

describe('Korean copula', () => {
  it('a noun with the copula splits into the noun and the copula (학생이에요, 그거야)', async () => {
    expect((await splitWords([tok('학생이에요')], lexicon)).map((t) => [t.surface, !!t.copula])).toEqual([['학생', false], ['이에요', true]]);
    expect((await splitWords([tok('그거야')], lexicon)).map((t) => t.surface)).toEqual(['그거', '야']);
  });
  it('the copula block reads as 이다 "to be"', () => {
    const out = copulaStage([B('이에요', [{ pos: 'adv' }], { copula: true })]);
    expect(out[0].candidates[0].analysis).toMatchObject({ pos: 'verb', copula: true, form: 'cop' });
  });
  it('a common pronoun is the pronoun (우리: we, not the pen)', () => {
    const out = pronounStage([B('우리', [{ pos: 'noun' }, { pos: 'pron' }])]);
    expect(out[0].candidates.map((c) => c.analysis.pos)).toEqual(['pron']);
  });
});
describe('Korean colloquial 거 is 것', () => {
  it('거야 → 거 (key 것) + 야', async () => {
    const lex = { lookupAll: async (keys) => new Map(keys.map((k) => [k, k === '것' ? [{ pos: 'noun' }] : []])) };
    expect((await splitWords([tok('거야')], lex)).map((t) => [t.surface, t.key])).toEqual([['거', '것'], ['야', '야']]);
  });
});
describe('Korean contractions with the particle fused (이건 = 이거 + 는)', () => {
  it('read as the word', async () => {
    const lex = { lookupAll: async (keys) => new Map(keys.map((k) => [k, k === '이거' ? [{ pos: 'pron' }] : []])) };
    expect((await splitWords([tok('이건')], lex)).map((t) => [t.surface, t.key])).toEqual([['이건', '이거']]);
  });
});
describe('Korean stacked particles', () => {
  it('때에는 = 때 + 에는 (place + topic)', async () => {
    const lex = { lookupAll: async (keys) => new Map(keys.map((k) => [k, k === '때' ? [{ pos: 'noun' }] : []])) };
    expect((await splitWords([tok('때에는')], lex)).map((t) => t.surface)).toEqual(['때', '에는']);
  });
});
import { getLanguage } from '../../src/lang/registry.js';
describe('Korean badges', () => {
  it('show the ending or the speech level, not internal names', () => {
    const fb = getLanguage('ko').inventory.formBadge;
    expect([fb.so, fb.but, fb['adn pres'], fb.haeyo, fb['haeyo past q'], fb.handa, fb.hamnida]).toEqual(['-어서', '-지만', '-는', 'pol', 'pol pst?', 'pln', 'fml']);
  });
});
import { negationStage } from '../../src/lang/ko/stages.js';
describe('Korean -지 않다', () => {
  it('the -지 form before 않다 is the verb', () => {
    const b = (key, as) => ({ token: { key, surface: key }, candidates: as.map((a) => ({ analysis: a, reasons: [], links: [] })), pinned: null });
    const out = negationStage([b('먹지', [{ pos: 'verb', form: 'ji', lemma: 'eat' }, { pos: 'noun', lemma: 'paper' }]), b('않았다', [{ pos: 'verb', lemma: 'not', form: 'handa past' }])]);
    expect(out[0].candidates.map((c) => c.analysis.pos)).toEqual(['verb']);
  });
});
