import { describe, it, expect } from 'vitest';
import { splitWords, copulaStage } from '../../src/lang/tr/copula.js';

const tok = (surface) => ({ surface, kind: 'word', key: surface.toLowerCase(), start: 0, end: surface.length, enclitic: null });
const lex = (known) => ({ lookupAll: async (keys) => new Map(keys.map((k) => [k, known.includes(k) ? [{ pos: 'noun' }] : []])) });

describe('Turkish copula -DIr', () => {
  it('splits off a known word (yıldızıdır = yıldızı + dır); a known word stays whole', async () => {
    expect((await splitWords([tok('yıldızıdır')], lex(['yıldızı']))).map((t) => [t.surface, !!t.copula])).toEqual([['yıldızı', false], ['dır', true]]);
    expect((await splitWords([tok('kadir')], lex(['kadir', 'ka']))).map((t) => t.surface)).toEqual(['kadir']);
  });
  it('the copula reads as “is”', () => {
    const out = copulaStage([{ token: { key: 'dır', copula: true }, candidates: [], pinned: null }]);
    expect(out[0].candidates[0].analysis).toMatchObject({ pos: 'verb', copula: true, person: '3' });
  });
});
