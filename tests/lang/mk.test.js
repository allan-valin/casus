import { describe, it, expect } from 'vitest';
import { getLanguage } from '../../src/lang/registry.js';
import { createState } from '../../src/lib/state.js';
import { makeColors } from '../../src/app/lib/colors.js';

const mk = getLanguage('mk');
const N = (lemma, c, n, g, pos = 'noun') => ({ lemma, pos, case: c, number: n, gender: g });
const LEX = { книгата: [N('k', 'def', 'sg', 'f')], книгава: [N('k', 'prox', 'sg', 'f')], чита: [{ lemma: 'c', pos: 'verb', person: '3', number: 'sg', tense: 'pres', aspect: 'impf' }],
  таа: [N('taa', 'indef', 'sg', 'f', 'pron')] };
const lexicon = { lookupAll: async (keys) => new Map(keys.map((k) => [k, LEX[k] ?? []])) };

describe('Macedonian', () => {
  it('the article ending is the colour: definite, this (proximal), that (distal)', async () => {
    const s = createState({ text: 'Таа ја чита книгата.', lexicon, lang: mk });
    await s.load();
    const b = s.blocks();
    const colors = makeColors(mk.inventory);
    const L = { nominal: true, verb: true, function: true };
    expect(colors.blockStyle(b.find((x) => x.token.surface === 'книгата'), L).badge).toBe('Def');
    expect(b.find((x) => x.token.surface === 'чита').candidates[0].analysis.tense).toBe('pres');
    expect(mk.script.romanize('книгата')).toBe('knigata');
  });
});

describe('a letter name or an interjection loses to a real reading', () => {
  it('е is the verb "is", not the letter or "eh"', async () => {
    const L2 = { ова: [{ lemma: 'ova', pos: 'pron', case: 'indef', number: 'sg', gender: 'n' }], е: [{ lemma: 'e', pos: 'noun' }, { lemma: 'e2', pos: 'interj' }, { lemma: 'sum', pos: 'verb', person: '3', number: 'sg', tense: 'pres' }], град: [{ lemma: 'g', pos: 'noun', case: 'indef', number: 'sg', gender: 'm' }] };
    const lx = { lookupAll: async (keys) => new Map(keys.map((k) => [k, L2[k] ?? []])) };
    const s = createState({ text: 'Ова е град.', lexicon: lx, lang: mk });
    await s.load();
    expect(s.blocks()[1].candidates.map((c) => c.analysis.pos)).toEqual(['verb']);
  });
});
