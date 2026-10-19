import { describe, it, expect } from 'vitest';
import { matchRule, formPool } from '../../tools/learn_match.mjs';

const blk = (surface, ...analyses) => ({ token: { surface }, candidates: analyses.map((analysis) => ({ analysis })) });
// Јас ќе го видам Том.
const S = [
  blk('Јас', { pos: 'pron' }),
  blk('ќе', { pos: 'particle' }),
  blk('го', { pos: 'pron' }),
  blk('видам', { pos: 'verb', tense: 'pres', person: '1', number: 'sg', aspect: 'pf', lemma: '7' }),
  blk('Том', { pos: 'noun', case: 'indef' }),
  blk('.'),
];

describe('lesson rules on the reader’s analysis (curriculum languages: Macedonian first)', () => {
  it('one morphological condition: the word whose every reading fits', () => {
    expect(matchRule(S, { seq: [{ pos: 'verb', tense: 'pres' }] })).toEqual({ span: [3, 4], gap: 3 });
    expect(matchRule(S, { seq: [{ pos: 'verb', tense: 'aor' }] })).toBe(null);
  });
  it('an ambiguous word only counts when all its readings fit', () => {
    const amb = [blk('пиша', { pos: 'verb', tense: 'pres' }, { pos: 'noun' })];
    expect(matchRule(amb, { seq: [{ pos: 'verb', tense: 'pres' }] })).toBe(null);
  });
  it('a sequence with words between (clitics): ќе … verb, the gap on the verb or on ќе', () => {
    expect(matchRule(S, { seq: [{ word: ['ќе'] }, { pos: 'verb', tense: 'pres' }], near: 2, gap: 1 })).toEqual({ span: [3, 4], gap: 3 });
    expect(matchRule(S, { seq: [{ word: ['ќе'] }, { pos: 'verb' }], near: 0, gap: 0 })).toBe(null);
    expect(matchRule(S, { seq: [{ word: ['ќе'] }, { pos: 'verb' }], near: 2, gap: 0 })).toEqual({ span: [1, 2], gap: 1 });
  });
  it('word lists are case-insensitive; not excludes', () => {
    expect(matchRule(S, { seq: [{ word: ['јас'] }] })).toEqual({ span: [0, 1], gap: 0 });
    expect(matchRule(S, { seq: [{ pos: 'verb', not: { aspect: 'pf' } }] })).toBe(null);
  });
  it('the wrong answers are the same word’s other forms, nearest first', () => {
    const rows = [['видам', 'v1spp'], ['видиш', 'v2spp'], ['види', 'v3spp'], ['видов', 'v1sap'], ['видам', 'v1sxp']];
    const decode = (code) => ({ person: code[1], tense: code[3] });
    expect(formPool(rows, 'видам', 'v1spp', decode)).toEqual(['видиш', 'види', 'видов']);
  });
});

describe('more conditions', () => {
  it('lemma: a regex on the dictionary form; re: a regex on the word; start: first word', () => {
    const lemmaOf = (id) => ({ 7: 'види' })[id];
    expect(matchRule(S, { seq: [{ pos: 'verb', lemma: 'и$' }] }, { lemmaOf })).toEqual({ span: [3, 4], gap: 3 });
    expect(matchRule(S, { seq: [{ pos: 'verb', lemma: 'а$' }] }, { lemmaOf })).toBe(null);
    expect(matchRule(S, { seq: [{ re: 'ам$' }] })).toEqual({ span: [3, 4], gap: 3 });
    expect(matchRule(S, { seq: [{ word: ['ќе'], start: true }] })).toBe(null);
    expect(matchRule(S, { seq: [{ word: ['јас'], start: true }] })).toEqual({ span: [0, 1], gap: 0 });
  });
  it('a lesson may have several rules: the first that matches', () => {
    expect(matchRule(S, [{ seq: [{ pos: 'verb', tense: 'aor' }] }, { seq: [{ word: ['том'] }] }])).toEqual({ span: [4, 5], gap: 4, rule: 1 });
  });
});
import { gapText, spellingVariants } from '../../tools/learn_match.mjs';
describe('spaced languages and distractors (mk real-data check, 2026-10-19)', () => {
  it('the gap is cut from the original text, spaces kept', () => {
    const tokens = [{ start: 0, end: 4 }, { start: 5, end: 8 }, { start: 9, end: 15 }];
    expect(gapText('Имам две сестри.', tokens, [1, 2])).toEqual([['Имам ', null], ['＿＿', null], [' сестри.', null]]);
  });
  it('prefixed forms (најдобар, подобар) are not distractors for добар; five nearest only', () => {
    const rows = [['добар', 'a'], ['најдобар', 'a'], ['подобар', 'a'], ['добра', 'b'], ['добро', 'c'], ['добри', 'd'], ['добриот', 'e'], ['добрата', 'f'], ['доброто', 'g']];
    const pool = formPool(rows, 'добар', 'a', (c) => ({ c }));
    expect(pool).not.toContain('најдобар');
    expect(pool).not.toContain('подобар');
    expect(pool.length).toBe(5);
  });
  it('spelling distractors swap the special letters for their plain neighbours', () => {
    const v = spellingVariants('ќерка', { ќ: ['к', 'ч'], ѓ: ['г', 'џ'] });
    expect(v).toEqual(['керка', 'черка']);
    expect(spellingVariants('мама', { ќ: ['к'] })).toEqual([]);
  });
});
import { unsuitable } from '../../tools/learn_match.mjs';
describe('quality filters', () => {
  it('a form that is another form with a short prefix is left out; same keeps chosen features', () => {
    const rows = [['стариот', 'd.m'], ['најстар', 'i.m'], ['стар', 'i.m'], ['старата', 'd.f'], ['старото', 'd.n'], ['стариов', 'p.m'], ['старите', 'd.p']];
    const decode = (c) => ({ case: c.split('.')[0], gender: c.split('.')[1] });
    expect(formPool(rows, 'стариот', 'd.m', decode)).not.toContain('најстар');
    expect(formPool(rows, 'стариот', 'd.m', decode, 5, ['case'])).toEqual(['старата', 'старото', 'старите']);
  });
  it('sexual or vulgar sentences are not used', () => {
    expect(unsuitable('I love anal sex.')).toBe(true);
    expect(unsuitable('Touch my breasts.')).toBe(true);
    expect(unsuitable('The book is on the table.')).toBe(false);
    expect(unsuitable('Essex is in England.')).toBe(false);
  });
});
import { prefixVariants } from '../../tools/learn_match.mjs';
it('degree distractors: the same word with the other prefixes', () => {
  expect(prefixVariants('по-голем', ['', 'по-', 'нај'])).toEqual(['голем', 'најголем']);
  expect(prefixVariants('Најдобро', ['', 'по-', 'нај'])).toEqual(['Добро', 'По-добро']);
});
it('noTrail: a word followed by a comma does not count (Да, лут сум: да is "yes")', () => {
  const S2 = [{ token: { surface: 'Да', trail: ',' }, candidates: [] }, { token: { surface: 'одам' }, candidates: [{ analysis: { pos: 'verb', tense: 'pres' } }] }];
  expect(matchRule(S2, { seq: [{ word: ['да'], noTrail: true }, { pos: 'verb' }], near: 1, gap: 0 })).toBe(null);
  S2[0].token.trail = undefined;
  expect(matchRule(S2, { seq: [{ word: ['да'], noTrail: true }, { pos: 'verb' }], near: 1, gap: 0 })).toEqual({ span: [0, 1], gap: 0 });
});
