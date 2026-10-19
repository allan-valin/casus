import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { stripRu } from '../../src/lang/ru/normalize.js';
import { romanizeRu } from '../../src/lang/ru/romanize.js';
import { getLanguage } from '../../src/lang/registry.js';
import { createState } from '../../src/lib/state.js';

describe('Russian keys and letters', () => {
  it('strip mirrors the build', () => { for (const [w, s] of Object.entries(JSON.parse(readFileSync('tests/fixtures/ru.strip.json', 'utf8')))) expect(stripRu(w)).toBe(s); });
  it.each([['кни́га', 'kníga'], ['чита́ть', 'čitátʹ'], ['Москва́', 'Moskvá'], ['ёлка', 'jolka'], ['съесть', 'sʺjestʹ'], ['большо́й', 'bolʹšój'], ['щи', 'šči'], ['хорошо́', 'xorošó'], ['поезд', 'pojezd']])(
    '%s → %s', (a, r) => expect(romanizeRu(a)).toBe(r));
});

const ru = getLanguage('ru');
const N = (lemma, c, n, g, pos = 'noun') => ({ lemma, pos, case: c, number: n, gender: g });
const LEX = {
  'в': [{ lemma: 'v', pos: 'prep' }], 'кни́ге': [N('k', 'dat', 'sg', 'f'), N('k', 'pre', 'sg', 'f')], 'кни́гу': [N('k', 'acc', 'sg', 'f')],
  'кни́га': [N('k', 'nom', 'sg', 'f')], 'но́вая': [N('nv', 'nom', 'sg', 'f', 'adj')], 'но́вую': [N('nv', 'acc', 'sg', 'f', 'adj')],
  'чита́ю': [{ lemma: 'c', pos: 'verb', person: '1', number: 'sg', tense: 'pres', mood: 'ind', aspect: 'impf' }], 'я': [N('ja', 'nom', 'sg', null, 'pron')],
};
const marked = Object.keys(LEX);
const lexicon = { lookupAll: async (keys) => new Map(keys.map((k) => [k, marked.filter((m) => stripRu(m) === stripRu(k)).flatMap((m) => LEX[m].map((a) => (m === k ? a : { ...a, marked: m })))])) };
async function read(t) { const s = createState({ text: t, lexicon, lang: ru }); await s.load(); return s.blocks(); }

describe('Russian reader', () => {
  it('в + the prepositional or accusative: в книге is prepositional (not dative)', async () => {
    const b = await read('в книге.');
    expect(b[1].candidates.map((c) => c.analysis.case)).toEqual(['pre']);
  });
  it('an adjective agrees with its noun: я читаю новую книгу', async () => {
    const b = await read('Я читаю новую книгу.');
    expect(b[2].candidates.map((c) => c.analysis.case)).toEqual(['acc']);
    expect(b.map((x) => x.token.surface)).toEqual(['Я', 'читаю', 'новую', 'книгу']);
  });
  it('stress is supplied over the block', async () => {
    const b = await read('Я читаю новую книгу.');
    expect(b[3].candidates[0].analysis.marked).toBe('кни́гу');
  });
});

describe('Russian clause rules', () => {
  const L2 = {
    'я': [{ lemma: 'letter', pos: 'noun' }, { lemma: 'ja', pos: 'pron', case: 'nom' }],
    'чита́ю': [{ lemma: 'c', pos: 'verb', person: '1', number: 'sg', tense: 'pres', mood: 'ind', aspect: 'impf' }],
    'ма́ма': [N('m', 'nom', 'sg', 'f')], 'пи́шет': [{ lemma: 'p', pos: 'verb', person: '3', number: 'sg', tense: 'pres', mood: 'ind', aspect: 'impf' }],
    'письмо́': [N('l', 'nom', 'sg', 'n'), N('l', 'acc', 'sg', 'n')],
  };
  const m2 = Object.keys(L2);
  const lx = { lookupAll: async (keys) => new Map(keys.map((k) => [k, m2.filter((m) => stripRu(m) === stripRu(k)).flatMap((m) => L2[m].map((a) => ({ ...a, marked: m })))])) };
  const read2 = async (t) => { const s = createState({ text: t, lexicon: lx, lang: ru }); await s.load(); return s.blocks(); };
  it('a pronoun without a number keeps its nominative; the letter я goes', async () => {
    const b = await read2('Я читаю.');
    expect(b[0].candidates.map((c) => c.analysis.pos)).toEqual(['pron']);
  });
  it('one subject per clause: Мама пишет письмо — письмо is the object', async () => {
    const b = await read2('Мама пишет письмо.');
    expect(b[2].candidates.map((c) => c.analysis.case)).toEqual(['acc']);
  });
});
