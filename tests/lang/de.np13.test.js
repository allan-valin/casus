import { describe, it, expect } from 'vitest';
import { getLanguage } from '../../src/lang/registry.js';
import { createState } from '../../src/lib/state.js';

/* NP13 (docs/languages/de.md §10): the Saxon genitive — a name + -s right before a noun owns it (Peters Buch). */
const de = getLanguage('de');
const N = (c, n, g, pos = 'noun', lemma = 'x') => ({ lemma, pos, case: c, number: n, gender: g });
const V = (person, number, lemma = 'v') => ({ lemma, pos: 'verb', person, number, tense: 'pres', mood: 'ind' });
const LEX = {
  Peter: ['nom', 'dat', 'acc'].map((c) => N(c, 'sg', 'm', 'noun', 'Peter')), Peters: [N('nom', 'sg', 'm', 'noun', 'Peters')],
  Anna: ['nom', 'dat', 'acc'].map((c) => N(c, 'sg', 'f', 'noun', 'Anna')),
  Buch: [N('nom', 'sg', 'n', 'noun', 'Buch'), N('dat', 'sg', 'n', 'noun', 'Buch'), N('acc', 'sg', 'n', 'noun', 'Buch')],
  Mutter: ['nom', 'gen', 'dat', 'acc'].map((c) => N(c, 'sg', 'f', 'noun', 'Mutter')),
  liegt: [V('3', 'sg', 'liegen')], hier: [{ lemma: 'hier', pos: 'adv', degree: 'pos' }], ich: [N('nom', 'sg', 'x', 'pron', 'ich')], kenne: [V('1', 'sg', 'kennen')],
  Alles: [N('nom', 'sg', 'n', 'pron', 'alles'), N('acc', 'sg', 'n', 'pron', 'alles')], Gute: [N('nom', 'sg', 'n', 'noun', 'Gute'), N('acc', 'sg', 'n', 'noun', 'Gute')],
};
const lexicon = { lookupAll: async (keys) => new Map(keys.map((k) => [k, LEX[k] ?? []])) };
async function read(text) { const s = createState({ text, lexicon, lang: de }); await s.load(); return s.blocks(); }
const R = (b) => [...new Set(b.candidates.map((c) => [c.analysis.pos, c.analysis.case, c.analysis.number, c.analysis.gender].filter((x) => x && x !== 'x').join(' ')))].sort();
const by = (blocks, surface) => blocks.find((b) => b.token.surface === surface);

describe('NP13: Saxon genitive', () => {
  it('Peters Buch liegt hier: Peters is the genitive of Peter, Buch the subject', async () => {
    const b = await read('Peters Buch liegt hier.');
    expect(R(by(b, 'Peters'))).toEqual(['noun gen sg m']);
    expect(R(by(b, 'Buch'))).toEqual(['noun nom sg n']);
  });
  it('ich kenne Annas Mutter: Annas is genitive, Mutter accusative', async () => {
    const b = await read('ich kenne Annas Mutter.');
    expect(R(by(b, 'Annas'))).toEqual(['noun gen sg f']);
  });
  it('Alles Gute is untouched (alle is no name)', async () => {
    const b = await read('Alles Gute.');
    expect(R(by(b, 'Alles'))).not.toContain('noun gen sg n');
  });
});
