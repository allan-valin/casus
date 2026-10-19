import { describe, it, expect } from 'vitest';
import { vowelsAgree } from '../../src/lang/ar/normalize.js';
import { vowelStage } from '../../src/lang/ar/clause.js';
import { splitWords } from '../../src/lang/ar/tokenize.js';

const B = (surface, analyses) => ({ token: { surface, key: surface, index: 0 }, candidates: analyses.map((a) => ({ analysis: a, reasons: [], links: [] })), pinned: null });

describe('Arabic vowels in the text', () => {
  it('a vowel the text writes must be the reading’s (بِسْمِ is not بَسَمَ)', () => {
    expect(vowelsAgree('بِسْمِ', 'بَسَمَ')).toBe(false);
    expect(vowelsAgree('بسم', 'بَسَمَ')).toBe(true);
    expect(vowelsAgree('الْحَمْدُ', 'ٱلْحَمَد')).toBe(false);
    expect(vowelsAgree('الْحَمْدُ', 'ٱلْحَمْد')).toBe(true);
  });
  it('the stage drops readings whose vowels disagree, and the final ُ makes it nominative', () => {
    const out = vowelStage([B('الْحَمْدُ', [
      { pos: 'noun', case: 'nom', number: 'sg', marked: 'ٱلْحَمْد' }, { pos: 'noun', case: 'acc', number: 'sg', marked: 'ٱلْحَمْد' },
      { pos: 'noun', case: 'gen', number: 'sg', marked: 'ٱلْحَمْد' }, { pos: 'noun', case: 'nom', number: 'sg', marked: 'ٱلْحَمَد' }])]);
    expect(out[0].candidates.map((c) => [c.analysis.case, c.analysis.marked])).toEqual([['nom', 'ٱلْحَمْد']]);
  });
  it('a final kasra is not nominative', () => {
    const out = vowelStage([B('رَبِّ', [{ pos: 'noun', case: 'nom', number: 'sg' }, { pos: 'noun', case: 'gen', number: 'sg' }])]);
    expect(out[0].candidates.map((c) => c.analysis.case)).toEqual(['gen']);
  });
});

describe('the basmala', () => {
  it('بِسْمِ is bi + ism (the alif of اسم is not written here)', async () => {
    const lex = { lookupAll: async (keys) => new Map(keys.map((k) => [k, k === 'بسم' ? [{ pos: 'verb', marked: 'بَسَمَ' }] : k === 'اسم' ? [{ pos: 'noun', marked: 'اِسْم' }] : k === 'ب' ? [{ pos: 'prep' }] : []])) };
    const tok = { surface: 'بِسْمِ', kind: 'word', key: 'بسم', start: 0, end: 6, enclitic: null };
    expect((await splitWords([tok], lex)).map((t) => t.key)).toEqual(['ب', 'اسم']);
  });
});
import { idafaStage } from '../../src/lang/ar/clause.js';
describe('Arabic, more', () => {
  it('a verb’s last vowel counts (رَبِّ is not the verb رَبَّ)', () => {
    const out = vowelStage([B('رَبِّ', [{ pos: 'verb', person: '3', marked: 'رَبَّ' }, { pos: 'noun', case: 'gen', number: 'sg', marked: 'رَبِّ' }])]);
    expect(out[0].candidates.map((c) => c.analysis.pos)).toEqual(['noun']);
  });
  it('a noun in construct makes the definite word after it genitive (رَبِّ الْعَالَمِينَ)', () => {
    const blocks = [B('رَبِّ', [{ pos: 'noun', case: 'gen', number: 'sg' }]), B('الْعَالَمِينَ', [{ pos: 'noun', case: 'acc', number: 'pl' }, { pos: 'noun', case: 'gen', number: 'pl' }])];
    expect(idafaStage(blocks)[1].candidates.map((c) => c.analysis.case)).toEqual(['gen']);
  });
  it('لِلَّهِ is li + Allah', async () => {
    const lex = { lookupAll: async (keys) => new Map(keys.map((k) => [k, k === 'الله' ? [{ pos: 'noun', marked: 'اللّٰه' }] : k === 'ل' ? [{ pos: 'prep' }] : []])) };
    const tok = { surface: 'لِلَّهِ', kind: 'word', key: 'لله', start: 0, end: 7, enclitic: null };
    expect((await splitWords([tok], lex)).map((t) => t.key)).toEqual(['ل', 'الله']);
  });
});
describe('one-letter particles', () => {
  it('لِ is not لَ', () => expect(vowelsAgree('لِ', 'لَـ')).toBe(false));
});
