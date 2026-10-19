import { describe, it, expect } from 'vitest';
import { createState } from '../../src/lib/state.js';
import { getLanguage } from '../../src/lang/registry.js';

const lexicon = { lookupAll: async (keys) => new Map(keys.map((k) => [k, k === 'v' ? [{ lemma: '1', pos: 'prep' }] : k === 'twoją' ? [{ lemma: '9', pos: 'pron', case: 'acc', number: 'sg', gender: 'f' }] : []])) };

describe('words the dictionary lacks go to the live lookup', () => {
  it('Praze is read from Wiktionary; the extras learn its lemma', async () => {
    const asked = [];
    let extras = null;
    const live = {
      lookup: async (words) => { asked.push(...words); return new Map(words.map((w) => [w, w === 'Praze' ? { analyses: [{ lemma: 'w:cs:Praha', pos: 'noun', case: 'loc', number: 'sg' }], lemmas: { 'w:cs:Praha': { headword: 'Praha', pos: 'noun' } }, glosses: {}, alternativeOf: null } : { analyses: [], lemmas: {}, glosses: {}, alternativeOf: null }])); },
      onExtras: (e) => { extras = e; },
    };
    const s = createState({ text: 'v Praze.', lexicon, lang: getLanguage('cs'), live });
    await s.load();
    expect(asked).toEqual(['Praze']);
    expect(s.blocks()[1].candidates.map((c) => c.analysis.case)).toEqual(['loc']);
    expect(extras.lemmas['w:cs:Praha'].headword).toBe('Praha');
  });
  it('an alternative form takes the readings of the word it points at (twą = twoją)', async () => {
    const live = { lookup: async (words) => new Map(words.map((w) => [w, { analyses: [], lemmas: {}, glosses: {}, alternativeOf: 'twoją' }])), onExtras: () => {} };
    const s = createState({ text: 'twą.', lexicon, lang: getLanguage('pl'), live });
    await s.load();
    expect(s.blocks()[0].candidates[0].analysis).toMatchObject({ pos: 'pron', case: 'acc' });
  });
});
