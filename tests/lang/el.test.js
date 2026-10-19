import { describe, it, expect } from 'vitest';
import { getLanguage } from '../../src/lang/registry.js';
import { createState } from '../../src/lib/state.js';

const el = getLanguage('el');
const N = (lemma, c, n, g, pos = 'noun') => ({ lemma, pos, case: c, number: n, gender: g });
const LEX = {
  διαβάζει: [{ lemma: 'd', pos: 'verb', person: '3', number: 'sg', tense: 'pres', mood: 'ind' }],
  ένα: [N('e', 'acc', 'sg', 'n', 'det'), N('e', 'nom', 'sg', 'n', 'det')], βιβλίο: [N('b', 'nom', 'sg', 'n'), N('b', 'acc', 'sg', 'n'), N('b', 'voc', 'sg', 'n')],
  σε: [{ lemma: 'se', pos: 'prep' }], το: [N('to', 'nom', 'sg', 'n', 'det'), N('to', 'acc', 'sg', 'n', 'det')], σπίτι: [N('s', 'nom', 'sg', 'n'), N('s', 'acc', 'sg', 'n'), N('s', 'voc', 'sg', 'n')],
  η: [N('i', 'nom', 'sg', 'f', 'det')], μαρία: [N('m', 'nom', 'sg', 'f')],
};
const lexicon = { lookupAll: async (keys) => new Map(keys.map((k) => [k, LEX[k] ?? []])) };
async function read(t) { const s = createState({ text: t, lexicon, lang: el }); await s.load(); return s.blocks(); }
const C = (b) => [...new Set(b.candidates.map((c) => c.analysis.case))].sort();

describe('Modern Greek', () => {
  it('στο is σε + το: two blocks, the preposition governing the accusative', async () => {
    const b = await read('Η Μαρία διαβάζει στο σπίτι.');
    expect(b.map((x) => x.token.surface)).toEqual(['Η', 'Μαρία', 'διαβάζει', 'σ', 'το', 'σπίτι']);
    expect(C(b[5])).toEqual(['acc']);
  });
  it('the article and its noun share their case both ways; no vocative without an address', async () => {
    const b = await read('Η Μαρία διαβάζει ένα βιβλίο.');
    expect(C(b[4])).toEqual(['acc']);
  });
});

describe('an unknown value ("x" from the decoder) agrees with anything', () => {
  it('ένα with number x still settles βιβλίο', async () => {
    LEX.ένα = [N('e', 'acc', 'x', 'n', 'det')];
    const b = await read('Διαβάζει ένα βιβλίο.');
    expect(C(b[2])).toEqual(['acc']);
  });
});
