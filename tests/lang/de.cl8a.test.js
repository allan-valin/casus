import { describe, it, expect } from 'vitest';
import { getLanguage } from '../../src/lang/registry.js';
import { createState } from '../../src/lib/state.js';

/* CL8a (docs/languages/de.md §10): a zu-infinitive clause has no nominative, and its first article word is not a
 * relative pronoun. */
const de = getLanguage('de');
const N = (c, n, g, pos = 'noun', lemma = 'x') => ({ lemma, pos, case: c, number: n, gender: g });
const V = (person, number, tense = 'pres', mood = 'ind', lemma = 'v') => ({ lemma, pos: 'verb', person, number, tense, mood });
const ALL = (g, l) => ['nom', 'gen', 'dat', 'acc'].map((c) => N(c, 'sg', g, 'noun', l));
const LEX = {
  Ich: [N('nom', 'sg', 'x', 'pron', 'ich')], hoffe: [V('1', 'sg')],
  den: [N('acc', 'sg', 'm', 'det', 'der'), N('dat', 'pl', 'x', 'det', 'der'), N('acc', 'sg', 'm', 'pron', 'der')],
  Mann: [...ALL('m', 'Mann'), N('nom', 'pl', 'm', 'noun', 'Mann')], Hund: ALL('m', 'Hund'),
  zu: [{ lemma: 'zu', pos: 'prep', governs: 'dat' }], sehen: [V('0', 'x', 'x', 'inf', 'sehen'), V('3', 'pl', 'pres', 'ind', 'sehen')],
  Er: [N('nom', 'sg', 'm', 'pron', 'er')], ging: [V('3', 'sg', 'pret')], ohne: [{ lemma: 'ohne', pos: 'prep', governs: 'acc' }, { lemma: 'ohne', pos: 'conj' }],
  füttern: [V('0', 'x', 'x', 'inf', 'füttern'), V('3', 'pl', 'pres', 'ind', 'füttern')],
};
const lexicon = { lookupAll: async (keys) => new Map(keys.map((k) => [k, LEX[k] ?? []])), file: async (n) => (n === 'valency.json' ? { sehen: ['acc'] } : null) };
async function read(text) { const s = createState({ text, lexicon, lang: de }); await s.load(); return s.blocks(); }
const R = (b) => [...new Set(b.candidates.map((c) => [c.analysis.pos, c.analysis.case, c.analysis.number, c.analysis.gender].filter((x) => x && x !== 'x').join(' ')))].sort();
const by = (blocks, surface) => blocks.find((b) => b.token.surface === surface);

describe('CL8a: no nominative in a zu-infinitive clause', () => {
  it('Ich hoffe, den Mann zu sehen: den Mann is the accusative object, not a relative clause', async () => {
    const b = await read('Ich hoffe, den Mann zu sehen.');
    expect(R(by(b, 'den'))).toEqual(['det acc sg m']);
    expect(R(by(b, 'Mann'))).toEqual(['noun acc sg m']);
  });
  it('Er ging, ohne den Hund zu füttern: ohne opens the clause as a conjunction, Hund is accusative', async () => {
    const b = await read('Er ging, ohne den Hund zu füttern.');
    expect(R(by(b, 'ohne'))).toEqual(['conj']);
    expect(R(by(b, 'Hund'))).toEqual(['noun acc sg m']);
  });
  it('the valency of the infinitive counts inside the clause: Mann (also a dative-plural unit form) is accusative after sehen', async () => {
    LEX.Mann = [...LEX.Mann, N('dat', 'pl', 'm', 'noun', 'Mann')];
    const b = await read('Ich hoffe, den Mann zu sehen.');
    expect(R(by(b, 'Mann'))).toEqual(['noun acc sg m']);
    expect(R(by(b, 'den'))).toEqual(['det acc sg m']);
  });
});
