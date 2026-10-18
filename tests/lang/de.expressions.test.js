import { describe, it, expect } from 'vitest';
import { getLanguage } from '../../src/lang/registry.js';
import { createState } from '../../src/lib/state.js';
import { gluePairs, items, partners } from '../../src/app/lib/chunks.js';

/* Fixed expressions (Allan, 2026-10-18): "es war einmal" glued as one chunk; a verb idiom found with its verb
 * inflected and separated ("sagte … Bescheid"). */
const de = getLanguage('de');
const EXPR = [
  { id: 1, h: 'es war einmal', w: ['es', 'war', 'einmal'], v: null, g: 'once upon a time' },
  { id: 2, h: 'Bescheid sagen', w: ['bescheid'], v: [30], g: 'to let (someone) know' },
  { id: 4, h: 'gar nicht', w: ['gar', 'nicht'], v: null, g: 'not at all' },
];
const LEX = {
  Es: [{ lemma: 'es', pos: 'pron', case: 'nom', number: 'sg', gender: 'n' }], war: [{ lemma: 'sein', pos: 'verb', person: '3', number: 'sg', tense: 'pret', mood: 'ind' }],
  einmal: [{ lemma: 'e', pos: 'adv', degree: 'pos' }], ein: [{ lemma: 'ein', pos: 'det', case: 'nom', number: 'sg', gender: 'm' }],
  König: [{ lemma: 'k', pos: 'noun', case: 'nom', number: 'sg', gender: 'm' }],
  Er: [{ lemma: 'er', pos: 'pron', case: 'nom', number: 'sg', gender: 'm' }], sagte: [{ lemma: '30', pos: 'verb', person: '3', number: 'sg', tense: 'pret', mood: 'ind' }],
  mir: [{ lemma: 'ich', pos: 'pron', case: 'dat', number: 'sg', gender: 'x' }], Bescheid: [{ lemma: 'b', pos: 'noun', case: 'acc', number: 'sg', gender: 'm' }],
  gar: [{ lemma: 'g', pos: 'adv', degree: 'pos' }], nicht: [{ lemma: 'n', pos: 'adv', degree: 'pos' }], kam: [{ lemma: 'k2', pos: 'verb', person: '3', number: 'sg', tense: 'pret', mood: 'ind' }],
};
const lexicon = { lookupAll: async (keys) => new Map(keys.map((k) => [k, LEX[k] ?? []])), file: async (name) => (name === 'expressions.json' ? EXPR : null) };
async function read(text) { const s = createState({ text, lexicon, lang: de }); await s.load(); return s.blocks(); }

describe('fixed expressions', () => {
  it('Es war einmal: the three words are one expression with its gloss, glued as one chunk', async () => {
    const b = await read('Es war einmal ein König.');
    expect(b[0].candidates[0].reasons.join(' ')).toMatch(/expression: es war einmal — once upon a time/);
    const glue = gluePairs(b);
    expect(items(b, b.map((x) => x.token.index), glue)[0].indices).toEqual([0, 1, 2]);
  });
  it('a verb idiom is found with its verb inflected and apart, and linked, not glued', async () => {
    const b = await read('Er sagte mir Bescheid.');
    const bescheid = b[3];
    expect(bescheid.candidates[0].reasons.join(' ')).toMatch(/expression: Bescheid … sagen — to let \(someone\) know/);
    expect(partners(b).get(3)).toContain(1);
  });
  it('gar nicht inside a sentence', async () => {
    const b = await read('Er kam gar nicht.');
    expect(b[2].candidates[0].reasons.join(' ')).toMatch(/expression: gar nicht/);
  });
  it('without the expressions file nothing changes', async () => {
    const s = createState({ text: 'Es war einmal ein König.', lexicon: { lookupAll: lexicon.lookupAll }, lang: de });
    await s.load();
    expect(s.blocks()[0].candidates[0].reasons.join(' ')).not.toMatch(/expression/);
  });
});
