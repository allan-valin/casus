import { describe, it, expect } from 'vitest';
import { matchRule, formPool, fits } from '../../tools/learn_match.mjs';

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
import { rewrite, markOf, suffixVariants } from '../../tools/learn_match.mjs';
describe('Arabic: vowels where the reading is sure, suffix distractors, dictionary-form condition', () => {
  const b = (surface, ...marks) => ({ token: { surface }, candidates: marks.map((marked) => ({ analysis: { marked } })) });
  it('markOf: the one vowelled form all readings share, else null', () => {
    expect(markOf(b('إلى', 'إِلَى'))).toBe('إِلَى');
    expect(markOf(b('المدرسة', 'الْمَدْرَسَةِ', 'الْمُدَرِّسَةِ'))).toBe(null);
    expect(markOf(b('Том'))).toBe(null);
  });
  it('rewrite: each word replaced, spaces and punctuation kept, a gap where asked', () => {
    const tokens = [{ start: 0, end: 4 }, { start: 5, end: 8 }, { start: 9, end: 16 }];
    expect(rewrite('ذهبت إلى المدرسة.', tokens, (i) => ['ذَهَبْتُ', 'إِلَى', null][i])).toEqual([['ذَهَبْتُ إِلَى المدرسة.', null]]);
    expect(rewrite('ذهبت إلى المدرسة.', tokens, (i) => ['ذَهَبْتُ', 'إِلَى', null][i], [1, 2])).toEqual([['ذَهَبْتُ ', null], ['＿＿', null], [' المدرسة.', null]]);
  });
  it('suffix distractors: the same stem with the other suffixes, longest suffix taken off first', () => {
    expect(suffixVariants('كتابها', ['ي', 'ك', 'ه', 'ها', 'نا'])).toEqual(['كتابي', 'كتابك', 'كتابه', 'كتابنا']);
  });
  it('dict: a regex on the dictionary form', () => {
    const blocks = [{ token: { surface: 'درّس' }, candidates: [{ analysis: { pos: 'verb', lemma: '5' } }] }];
    const dictOf = (id) => ({ 5: 'دَرَّسَ (form II)' })[id];
    expect(matchRule(blocks, { seq: [{ pos: 'verb', dict: 'form II\\)' }] }, { dictOf })).toEqual({ span: [0, 1], gap: 0 });
    expect(matchRule(blocks, { seq: [{ pos: 'verb', dict: 'form I\\)' }] }, { dictOf })).toBe(null);
  });
});
it('norm: word lists and re compare the normalised word (Arabic: vowels and hamza forms folded)', () => {
  const strip = (s) => s.replace(/[ً-ْ]/g, '').replace(/[أإآ]/g, 'ا');
  const blocks = [{ token: { surface: 'أَنَا' }, candidates: [] }];
  expect(matchRule(blocks, { seq: [{ word: ['انا'] }] }, { norm: strip })).toEqual({ span: [0, 1], gap: 0 });
  expect(matchRule(blocks, { seq: [{ word: ['أنا'] }] }, { norm: strip })).toEqual({ span: [0, 1], gap: 0 });
  expect(matchRule(blocks, { seq: [{ re: '^انا$' }] }, { norm: strip })).toEqual({ span: [0, 1], gap: 0 });
});
import { rowFor } from '../../tools/learn_match.mjs';
it('rowFor: the paradigm row of a written word — same bare letters, same features as one of its readings', () => {
  const strip = (s) => s.replace(/[ً-ْ]/g, '');
  const rows = [['كَتَبَ', 'p3sm'], ['كَتَبْتُ', 'p1sm'], ['كُتُبٌ', 'n']];
  const decode = (c) => ({ tense: c[0] === 'p' ? 'past' : 'x', person: c[1] });
  expect(rowFor(rows, 'كتبت', [{ tense: 'past', person: '1' }], decode, strip)).toEqual(['كَتَبْتُ', 'p1sm']);
  expect(rowFor(rows, 'كتبت', [{ tense: 'past', person: '3' }], decode, strip)).toBe(null);
});
it('rowFor: readings that lead to different forms (case not known) give no row', () => {
  const strip = (s) => s.replace(/[ً-ْ]/g, '');
  const rows = [['صَغِيرَةٌ', 'n'], ['صَغِيرَةً', 'a'], ['صَغِيرَةٍ', 'g']];
  const decode = (c) => ({ case: { n: 'nom', a: 'acc', g: 'gen' }[c] });
  expect(rowFor(rows, 'صغيرة', [{ case: 'nom' }, { case: 'acc' }], decode, strip)).toBe(null);
  expect(rowFor(rows, 'صغيرة', [{ case: 'gen' }], decode, strip)).toEqual(['صَغِيرَةٍ', 'g']);
});
it('state (Arabic definiteness) is a feature rules can ask for', () => {
  const blocks = [{ token: { surface: 'منشفة' }, candidates: [{ analysis: { pos: 'noun', state: 'indef' } }] }];
  expect(matchRule(blocks, { seq: [{ pos: 'noun', state: 'def' }] })).toBe(null);
  expect(matchRule(blocks, { seq: [{ pos: 'noun', state: 'indef' }] })).toEqual({ span: [0, 1], gap: 0 });
});
it('notStart: not the first word (من opening a question is "who")', () => {
  const blocks = [{ token: { surface: 'من' }, candidates: [] }, { token: { surface: 'هنا' }, candidates: [] }];
  expect(matchRule(blocks, { seq: [{ word: ['من'], notStart: true }] })).toBe(null);
});
it('suffixVariants ignores vowel marks and gives nothing when no suffix is there', () => {
  expect(suffixVariants('والديّ', ['ي', 'ك'])).toEqual(['والدك']);
  expect(suffixVariants('بيت', ['ي', 'ك'])).toEqual([]);
});
import { consonantV } from '../../tools/learn_match.mjs';
it('Latin consonantal u written v, as the sentence writes it (uideor → videor, but tuus, sua stay)', () => {
  expect(['uideor', 'uidebaris', 'nouus', 'tuus', 'suam', 'uir', 'Uenit', 'uoluit'].map(consonantV)).toEqual(['videor', 'videbaris', 'novus', 'tuus', 'suam', 'vir', 'Venit', 'voluit']);
});
import { followSpelling } from '../../tools/learn_match.mjs';
it('wrong answers follow the answer’s spelling where the paradigm differs (silva written with v)', () => {
  expect(followSpelling('silvam', 'siluam', ['silua', 'siluae'])).toEqual(['silva', 'silvae']);
  expect(followSpelling('linguae', 'linguae', ['lingua'])).toEqual(['lingua']);
});
it('a variant of the answer in the same slot (ἐστί for ἐστίν) is never a wrong answer', () => {
  const rows = [['ἐστίν', 'v3s'], ['ἐστί', 'v3s'], ['εἰσί', 'v3p'], ['εἰμί', 'v1s']];
  expect(formPool(rows, 'ἐστίν', 'v3s', (c) => ({ p: c[1], n: c[2] }))).toEqual(['εἰσί', 'εἰμί']);
});
it('trail: what follows the word (a comma before a relative clause)', () => {
  const blocks = [{ token: { surface: 'Mann', trail: ',' }, candidates: [{ analysis: { pos: 'noun' } }] }, { token: { surface: 'der' }, candidates: [] }];
  expect(matchRule(blocks, { seq: [{ pos: 'noun', trail: ',' }, { word: ['der'] }], gap: 1 })).toEqual({ span: [1, 2], gap: 1 });
  blocks[0].token.trail = undefined;
  expect(matchRule(blocks, { seq: [{ pos: 'noun', trail: ',' }, { word: ['der'] }], gap: 1 })).toBe(null);
});
it('unknown: a word the dictionary does not have (Russian gerunds in the core lexicon)', () => {
  const blocks = [{ token: { surface: 'улыбаясь' }, candidates: [] }, { token: { surface: 'дом' }, candidates: [{ analysis: { pos: 'noun' } }] }];
  expect(matchRule(blocks, { seq: [{ re: 'ясь$', unknown: true }] })).toEqual({ span: [0, 1], gap: 0 });
  expect(matchRule(blocks, { seq: [{ re: 'ом$', unknown: true }] })).toBe(null);
});
it('Hangul spelling variants swap letters inside the syllable block (decomposed, then recomposed)', () => {
  const swaps = { 'ᅥ': ['ᅩ'], 'ᄀ': ['ᄏ'] };
  expect(spellingVariants('거'.normalize('NFD'), swaps).map((w) => w.normalize('NFC'))).toEqual(['커', '고']);
});

import { preferAttested } from '../../tools/learn_match.mjs';

it('preferAttested keeps only the generated forms seen in real text', () => {
  const seen = new Set(['puhuttiin', 'puhuisi']);
  expect(preferAttested(['puhutiin', 'puhuttiin', 'puhuisi'], seen)).toEqual(['puhuttiin', 'puhuisi']);
  expect(preferAttested(['πρέπω', 'πρέπεις'], seen)).toEqual([]);
});

import { looksLikeName } from '../../tools/learn_match.mjs';

it('looksLikeName: a capitalised word that starts with a listed name (Tom → Tomille), not places or other words', () => {
  const names = ['Tom', 'Mari', 'Anni'];
  expect(looksLikeName('Tomille', names)).toBe(true);
  expect(looksLikeName('Marille', names)).toBe(true);
  expect(looksLikeName('Helsingissä', names)).toBe(false);
  expect(looksLikeName('tomaatti', names)).toBe(false);
  expect(looksLikeName('Anna', names)).toBe(false);
});

import { dropMarked } from '../../tools/learn_match.mjs';

it('dropMarked leaves out wrong answers with a marked ending unless the answer has it', () => {
  const re = '(ni|si|mme|nne|nsa|nsä)$';
  expect(dropMarked(['elämä', 'elämieni', 'elämillämme', 'elämässä'], 'elämää', re)).toEqual(['elämä', 'elämässä']);
  expect(dropMarked(['ystävälläni', 'ystävälle'], 'ystävälleni', re)).toEqual(['ystävälläni', 'ystävälle']);
});

it('re also matches the word as written when the key strips accents (Modern Greek -άς)', () => {
  const strip = (w) => w.normalize('NFD').replace(/\p{M}/gu, '').normalize('NFC').toLocaleLowerCase();
  const block = { token: { surface: 'Μιλάς' }, candidates: [] };
  expect(fits(block, { re: 'άς$' }, null, null, strip)).toBe(true);
  expect(fits(block, { re: 'ας$' }, null, null, strip)).toBe(true);
});

it('suffixVariants keeps marks that belong to the suffix (Devanagari vowel signs, virama)', () => {
  expect(suffixVariants('गच्छति', ['ति', 'न्ति', 'ामि'])).toEqual(['गच्छन्ति', 'गच्छामि']);
});

import { dropPartners } from '../../tools/learn_match.mjs';

it('dropPartners removes the same form in the other gender (both are right for an unseen speaker)', () => {
  const pairs = [['łem', 'łam'], ['ł', 'ła']];
  expect(dropPartners(['popełniłam', 'popełnił', 'popełniliśmy'], 'popełniłem', pairs)).toEqual(['popełnił', 'popełniliśmy']);
  expect(dropPartners(['četla', 'četli'], 'četl', [['l', 'la']])).toEqual(['četli']);
});

it('rules can ask for a possessive or a negative verb (Turkish evim, gelmedi)', () => {
  const b = (surface, a) => ({ token: { surface }, candidates: [{ analysis: a }] });
  expect(fits(b('evim', { pos: 'noun', poss: '1sg' }), { poss: ['1sg', '2sg'] })).toBe(true);
  expect(fits(b('ev', { pos: 'noun', poss: 'x' }), { poss: ['1sg', '2sg'] })).toBe(false);
  expect(fits(b('gelmedi', { pos: 'verb', polarity: 'neg' }), { polarity: 'neg' })).toBe(true);
});

import { shareStem } from '../../tools/learn_match.mjs';

it('shareStem keeps wrong answers that differ from the answer only in its last letters (person endings)', () => {
  expect(shareStem(['inanıyorum', 'inanabiliyordunuz', 'inanıyorsunuz'], 'inanıyoruz', 5)).toEqual(['inanıyorum', 'inanıyorsunuz']);
  expect(shareStem(['oldum', 'olabilecek'], 'oldu', 5)).toEqual(['oldum']);
});

describe('who did what to whom (drills research item 5): the doer and the one done to, when the cases are sure', () => {
  const de = [
    blk('Den', { pos: 'det', case: 'acc' }), blk('Mann', { pos: 'noun', case: 'acc' }, { pos: 'noun', case: 'nom' }),
    blk('sieht', { pos: 'verb' }), blk('der', { pos: 'det', case: 'nom' }, { pos: 'det', case: 'dat' }), blk('Hund', { pos: 'noun', case: 'nom' }), blk('.'),
  ];
  it('one sure subject and one sure object: their places, and whether the object comes first', async () => {
    const { rolesOf } = await import('../../tools/learn_match.mjs');
    const ru = [blk('Собаку', { pos: 'noun', case: 'acc' }), blk('видит', { pos: 'verb' }), blk('мальчик', { pos: 'noun', case: 'nom' }), blk('.')];
    expect(rolesOf(ru)).toEqual({ sbj: 2, obj: 0, objFirst: true });
  });
  it('an ambiguous noun (Mann: nominative or accusative) is not sure, so no question', async () => {
    const { rolesOf } = await import('../../tools/learn_match.mjs');
    expect(rolesOf(de)).toBe(null);
  });
  it('English pronoun cases count (sbj / obj); no verb or two subjects: no question', async () => {
    const { rolesOf } = await import('../../tools/learn_match.mjs');
    expect(rolesOf([blk('She', { pos: 'pron', case: 'sbj' }), blk('saw', { pos: 'verb' }), blk('him', { pos: 'pron', case: 'obj' })])).toEqual({ sbj: 0, obj: 2, objFirst: false });
    expect(rolesOf([blk('She', { pos: 'pron', case: 'sbj' }), blk('him', { pos: 'pron', case: 'obj' })])).toBe(null);
    expect(rolesOf([blk('Ich', { pos: 'pron', case: 'nom' }), blk('und', { pos: 'conj' }), blk('du', { pos: 'pron', case: 'nom' }), blk('sehen', { pos: 'verb' }), blk('ihn', { pos: 'pron', case: 'acc' })])).toBe(null);
  });
});

describe('who did what: only simple one-clause sentences', () => {
  it('an accusative after a preposition is not the object; two verbs or a comma: two clauses, no question', async () => {
    const { rolesOf } = await import('../../tools/learn_match.mjs');
    // Hún horfði á sjálfa sig.
    expect(rolesOf([blk('Hún', { pos: 'pron', case: 'nom' }), blk('horfði', { pos: 'verb' }), blk('á', { pos: 'prep' }), blk('sjálfa', { pos: 'pron', case: 'acc' })])).toBe(null);
    // Hún sagði við sjálfa sig: hvert ætti ég að fara
    expect(rolesOf([blk('Hún', { pos: 'pron', case: 'nom' }), blk('sagði', { pos: 'verb' }), blk('hann', { pos: 'pron', case: 'acc' }), blk('ætti', { pos: 'verb' })])).toBe(null);
    const comma = [blk('Er', { pos: 'pron', case: 'nom' }), blk('sieht', { pos: 'verb' }), blk('ihn', { pos: 'pron', case: 'acc' })];
    comma[0].token.trail = ',';
    expect(rolesOf(comma)).toBe(null);
  });
});

describe('who did what: a time phrase in the accusative is no object', () => {
  it('Allan morguninn leitaði ég hans: morguninn is "all morning", so no question', async () => {
    const { rolesOf } = await import('../../tools/learn_match.mjs');
    const s = [blk('morguninn', { pos: 'noun', case: 'acc', lemma: '9' }), blk('leitaði', { pos: 'verb' }), blk('ég', { pos: 'pron', case: 'nom' })];
    expect(rolesOf(s, { lemmaOf: (id) => ({ 9: 'morgunn' })[id] })).toBe(null);
  });
});

describe('who did what: every word read, no conjunction', () => {
  it('an unread word (an imperative with its clitic) or a conjunction (áður en …): no question', async () => {
    const { rolesOf } = await import('../../tools/learn_match.mjs');
    expect(rolesOf([blk('Pússaðu'), blk('skóna', { pos: 'noun', case: 'acc' }), blk('þú', { pos: 'pron', case: 'nom' }), blk('ferð', { pos: 'verb' })])).toBe(null);
    expect(rolesOf([blk('skóna', { pos: 'noun', case: 'acc' }), blk('en', { pos: 'conj' }), blk('þú', { pos: 'pron', case: 'nom' }), blk('ferð', { pos: 'verb' })])).toBe(null);
  });
});

describe('not: a word list or pattern excludes words (it silently excluded every word)', () => {
  it('not: { word } and not: { re } exclude only those words', () => {
    const s = [blk('Јас', { pos: 'pron' }), blk('го', { pos: 'pron' }), blk('видам', { pos: 'verb' })];
    expect(matchRule(s, { seq: [{ pos: 'pron', not: { word: ['јас'] } }] })).toEqual({ span: [1, 2], gap: 1 });
    expect(matchRule(s, { seq: [{ pos: 'pron', not: { re: '^ј' } }] })).toEqual({ span: [1, 2], gap: 1 });
    expect(matchRule(s, { seq: [{ pos: 'pron', not: { pos: 'pron' } }] })).toBe(null);
  });
});
