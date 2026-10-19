import { describe, it, expect } from 'vitest';
import { properNameStage } from '../../src/lib/classical.js';

const B = (i, surface, analyses = []) => ({ token: { index: i, surface, key: surface.toLowerCase(), clause: 0 }, candidates: analyses.map((a) => ({ analysis: a, reasons: [], links: [] })), pinned: null });

describe('proper names', () => {
  it('a capitalised word the dictionary does not know is a name', () => {
    const out = properNameStage([B(0, 'Maria'), B(1, 'deu', [{ pos: 'verb' }]), B(2, 'Praze')]);
    expect(out[0].candidates[0].analysis).toMatchObject({ pos: 'noun', proper: true });
    expect(out[2].candidates[0].analysis.pos).toBe('noun');
  });
  it('a lower-case unknown word stays unknown; a known word is untouched', () => {
    const out = properNameStage([B(0, 'xyzzy'), B(1, 'Deu', [{ pos: 'verb' }])]);
    expect(out[0].candidates).toEqual([]);
    expect(out[1].candidates[0].analysis.pos).toBe('verb');
  });
});
import { nameArticleStage } from '../../src/lib/classical.js';
describe('a name after an article', () => {
  it('takes the article’s case, gender and number; the article stays an article', () => {
    const out = nameArticleStage([B(0, 'Η', [{ pos: 'det', case: 'nom', gender: 'f', number: 'sg' }, { pos: 'conj' }, { pos: 'num' }]), B(1, 'Μαρία', [{ pos: 'noun', proper: true }])]);
    expect(out[0].candidates.map((c) => c.analysis.pos)).toEqual(['det']);
    expect(out[1].candidates[0].analysis).toMatchObject({ pos: 'noun', proper: true, case: 'nom', gender: 'f', number: 'sg' });
  });
  it('a name with no article is left alone', () => {
    const b = [B(0, 'Maria', [{ pos: 'noun', proper: true }])];
    expect(nameArticleStage(b)[0]).toBe(b[0]);
  });
});
