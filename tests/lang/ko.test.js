import { describe, it, expect } from 'vitest';
import { getLanguage } from '../../src/lang/registry.js';
import { createState } from '../../src/lib/state.js';
import { makeColors } from '../../src/app/lib/colors.js';

const ko = getLanguage('ko');
const LEX = {
  저: [{ lemma: 'jeo', pos: 'pron' }], 는: [{ lemma: 'neun', pos: 'particle' }], 학교: [{ lemma: 'hakgyo', pos: 'noun' }], 에: [{ lemma: 'e', pos: 'particle' }],
  가요: [{ lemma: 'gada', pos: 'verb', form: 'haeyo' }], 밥: [{ lemma: 'bap', pos: 'noun' }], 을: [{ lemma: 'eul', pos: 'particle' }, { lemma: 'eul2', pos: 'noun' }],
  먹었어요: [{ lemma: 'meokda', pos: 'verb', form: 'haeyo past' }],
};
const lexicon = { lookupAll: async (keys) => new Map(keys.map((k) => [k, LEX[k] ?? []])) };
async function read(t) { const s = createState({ text: t, lexicon, lang: ko }); await s.load(); return s.blocks(); }

describe('Korean', () => {
  it('a particle written onto its noun becomes its own block: 학교에 = 학교 + 에', async () => {
    const b = await read('저는 학교에 가요.');
    expect(b.map((x) => x.token.surface)).toEqual(['저', '는', '학교', '에', '가요']);
  });
  it('the particle gives the word before it its role, and the two are one chunk', async () => {
    const b = await read('저는 밥을 먹었어요.');
    expect(b[0].candidates.map((c) => c.analysis.case)).toEqual(['top']);
    expect(b[2].candidates.map((c) => c.analysis.case)).toEqual(['obj']);
    expect(b[3].candidates.map((c) => c.analysis.pos)).toEqual(['particle']);
    const colors = makeColors(ko.inventory);
    expect(colors.blockStyle(b[4], { nominal: true, verb: true, function: true }).badge).toBe('pol pst');
  });
  it('romanised under each word', async () => {
    const b = await read('저는 밥을 먹었어요.');
    expect(ko.script.romanize('먹었어요')).toBe('meogeosseoyo');
    expect(b.length).toBe(5);
  });
});

describe('Korean sentence rules', () => {
  const L2 = { 저는: [{ lemma: 'jeoneun', pos: 'pron' }, { lemma: 'jeolda', pos: 'verb', form: 'hae' }], 저: [{ lemma: 'jeo', pos: 'pron' }], 는: [{ lemma: 'neun', pos: 'particle' }],
    가요: [{ lemma: 'gada', pos: 'verb', form: 'haeyo' }, { lemma: 'gayo', pos: 'noun' }], 어제: [{ lemma: 'eoje', pos: 'noun' }, { lemma: 'eoje2', pos: 'adv' }] };
  const lx = { lookupAll: async (keys) => new Map(keys.map((k) => [k, L2[k] ?? []])) };
  const read2 = async (t) => { const s = createState({ text: t, lexicon: lx, lang: ko }); await s.load(); return s.blocks(); };
  it('a common pronoun + particle is split even when the dictionary lists the whole (저는 = 저 + 는)', async () => {
    expect((await read2('저는 가요.')).map((b) => b.token.surface)).toEqual(['저', '는', '가요']);
  });
  it('the last word of the sentence is the verb; a time word with no particle is the adverb', async () => {
    const b = await read2('어제 가요.');
    expect(b[1].candidates.map((c) => c.analysis.pos)).toEqual(['verb']);
    expect(b[0].candidates.map((c) => c.analysis.pos)).toEqual(['adv']);
  });
});

describe('Korean conjugation table', () => {
  it('speech level by tense and sentence type', async () => {
    const { paradigmGroups } = await import('../../src/app/lib/paradigm.js');
    const rows = [['먹다', 'va'], ['먹어요', 'vm'], ['먹었어요', 'vq'], ['먹습니다', 've']];
    const [g] = paradigmGroups(rows, '1', ko);
    expect(g.kind).toBe('table');
    expect(g.rows).toEqual(expect.arrayContaining(['hamnida', 'haeyo']));
    expect(g.cell('haeyo', 'present').map((i) => i.form)).toEqual(['먹어요']);
    expect(g.cell('haeyo', 'past').map((i) => i.form)).toEqual(['먹었어요']);
  });
});

describe('the sentence mark decides the polite ending (가요: goes / goes? / go! / let us go)', () => {
  const L3 = { 가요: ['haeyo', 'haeyo q', 'haeyo imp', 'haeyo let'].map((form) => ({ lemma: 'gada', pos: 'verb', form })) };
  const lx = { lookupAll: async (keys) => new Map(keys.map((k) => [k, L3[k] ?? []])) };
  const read3 = async (t) => { const s = createState({ text: t, lexicon: lx, lang: ko }); await s.load(); return s.blocks()[0].candidates.map((c) => c.analysis.form); };
  it('. statement, ? question, ! command or let us', async () => {
    expect(await read3('가요.')).toEqual(['haeyo']);
    expect(await read3('가요?')).toEqual(['haeyo q']);
    expect((await read3('가요!')).sort()).toEqual(['haeyo imp', 'haeyo let']);
  });
});

describe('Korean table lists the connectives too (2026-10-19)', () => {
  it('-어서 and -는 rows', async () => {
    const { koreanParadigm } = await import('../../src/lang/ko/paradigm.js');
    const g = koreanParadigm([{ analysis: { form: 'so' } }, { analysis: { form: 'adn pres' } }, { analysis: { form: 'haeyo' } }]);
    expect(g[0].rows).toEqual(['haeyo', 'so', 'adn pres']);
  });
});
