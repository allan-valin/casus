import { describe, it, expect } from 'vitest';
import { getLanguage } from '../../src/lang/registry.js';
import { createState } from '../../src/lib/state.js';

/* CL6: a separable particle at the end of a main clause belongs to the clause's finite verb (ruft … an =
 * anrufen); the pair is looked up as one word (anruft). */
const de = getLanguage('de');
const V = (person, number, lemma, tense = 'pres') => ({ lemma, pos: 'verb', person, number, tense, mood: 'ind' });
const LEX = {
  Er: [{ lemma: 'er', pos: 'pron', case: 'nom', number: 'sg', gender: 'm' }],
  ruft: [V('3', 'sg', 'rufen'), V('2', 'pl', 'rufen')],
  seine: [{ lemma: 'sein', pos: 'det', case: 'acc', number: 'sg', gender: 'f' }],
  Mutter: [{ lemma: 'm', pos: 'noun', case: 'acc', number: 'sg', gender: 'f' }],
  an: [{ lemma: 'an', pos: 'prep', governs: 'acc' }, { lemma: 'an2', pos: 'adv', degree: 'pos' }],
  anruft: [V('3', 'sg', 'anrufen'), V('2', 'pl', 'anrufen')],
  kam: [V('3', 'sg', 'kommen', 'pret')], spät: [{ lemma: 's', pos: 'adj', case: 'x', number: 'x', gender: 'x', infl: 'x', degree: 'pos' }],
};
const asked = [];
const lexicon = { lookupAll: async (keys) => { asked.push(...keys); return new Map(keys.map((k) => [k, LEX[k] ?? []])); } };
async function read(text) { const s = createState({ text, lexicon, lang: de }); await s.load(); return s.blocks(); }

describe('separable verbs', () => {
  it('ruft … an is anrufen: the verb takes the joined verb’s readings and both are linked', async () => {
    const b = await read('Er ruft seine Mutter an.');
    expect(asked).toContain('anruft');
    expect([...new Set(b[1].candidates.map((c) => c.analysis.lemma))]).toEqual(['anrufen']);
    expect(b[1].candidates[0].reasons.join(' ')).toMatch(/separable verb: ruft … an/);
    expect(b[4].candidates.flatMap((c) => c.links).some((l) => l.kind === 'expression' && l.index === 1)).toBe(true);
  });
  it('nothing happens when the joined form does not exist', async () => {
    const b = await read('Er kam spät.');
    expect(b[1].candidates[0].analysis.lemma).toBe('kommen');
  });
});
