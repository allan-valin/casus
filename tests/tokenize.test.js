import { describe, it, expect } from 'vitest';
import { tokenize } from '../src/lib/tokenize.js';

describe('tokenize', () => {
  it('numbers tokens in reading order', () => {
    expect(tokenize('Caesar venit').map((t) => t.index)).toEqual([0, 1]);
  });

  it('normalises the lookup key but keeps the surface', () => {
    const [t] = tokenize('Iulius');
    expect(t.surface).toBe('Iulius');
    expect(t.key).toBe('iulius');
  });

  it('splits the enclitic -que into its own token', () => {
    const tokens = tokenize('senatus populusque');
    expect(tokens.map((t) => t.key)).toEqual(['senatus', 'populus', 'que']);
    expect(tokens[1].enclitic).toBe('que');
    expect(tokens[2].enclitic).toBe(null);
  });

  it('does not split words that merely end in que', () => {
    expect(tokenize('quinque').map((t) => t.key)).toEqual(['quinque']);
    expect(tokenize('neque itaque').map((t) => t.key)).toEqual(['neque', 'itaque']);
  });

  it('emits punctuation as its own token', () => {
    const kinds = tokenize('Caesar, dux').map((t) => t.kind);
    expect(kinds).toEqual(['word', 'punct', 'word']);
  });

  it('records offsets into the sentence', () => {
    const text = 'Caesar venit';
    const [, second] = tokenize(text);
    expect(text.slice(second.start, second.end)).toBe('venit');
  });

  it('records offsets for both halves of a split word', () => {
    const text = 'arma virumque cano';
    const tokens = tokenize(text);
    for (const t of tokens) expect(text.slice(t.start, t.end)).toBe(t.surface);
    expect(tokens.map((t) => t.surface)).toEqual(['arma', 'virum', 'que', 'cano']);
  });

  it('splits -ne and -ue as well', () => {
    expect(tokenize('vidistine').map((t) => t.key)).toEqual(['uidisti', 'ne']);
    expect(tokenize('plusve').map((t) => t.key)).toEqual(['plus', 'ue']);
  });

  it('keeps macrons in the surface and drops them from the key', () => {
    const [t] = tokenize('rosā');
    expect(t.surface).toBe('rosā');
    expect(t.key).toBe('rosa');
  });

  it('returns nothing for an empty sentence', () => {
    expect(tokenize('')).toEqual([]);
  });
});
