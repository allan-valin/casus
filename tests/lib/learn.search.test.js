import { describe, it, expect } from 'vitest';
import { buildSearchIndex, searchIndex } from '../../src/lib/learn/search.js';

// Allan, 2026-10-27: "hallo" and "guten morgen" found nothing in Learn — the search read only titles and meanings
const LEARN = { levels: [{ id: 'A1', topics: [{ id: 't', kind: 'grammar', lessons: [{ id: 'greet' }, { id: 'nouns' }, { id: 'gone' }] }] }] };
const FILES = {
  greet: { id: 'greet', title: 'Begrüßung', intro: '<p>Man sagt <b>Hallo!</b> oder <i>Guten Morgen</i>.</p>', examples: [{ text: 'Guten Tag, Frau Becker.', en: 'Good day.' }], source: 'hallo-source-ignored' },
  nouns: { id: 'nouns', title: 'Substantive', sections: [{ html: '<p>Der Morgen, die Nacht.</p>' }] },
};

describe('Learn search index', () => {
  const index = buildSearchIndex(LEARN, (id) => FILES[id] ?? null);
  it('finds a word anywhere in a lesson, case and tags ignored', () => {
    expect(searchIndex(index, 'hallo')).toEqual(['greet']);
    expect(searchIndex(index, 'morgen')).toEqual(['greet', 'nouns']);
  });
  it('several words must all be in the lesson; the last may be unfinished', () => {
    expect(searchIndex(index, 'Guten Morgen')).toEqual(['greet']);
    expect(searchIndex(index, 'guten mor')).toEqual(['greet']);
  });
  it('the source line and missing files are not indexed; nothing for an empty query', () => {
    expect(searchIndex(index, 'source')).toEqual([]);
    expect(searchIndex(index, '  ')).toEqual([]);
  });
  it('words that are names of built-in properties (constructor, toString) are indexed like any word', () => {
    // 2026-10-27: the English and French sites failed to build on "constructor"
    const ix = buildSearchIndex(LEARN, (id) => (id === 'greet' ? { intro: 'the constructor and toString' } : null));
    expect(searchIndex(ix, 'constructor')).toEqual(['greet']);
    expect(searchIndex(ix, 'constructor tostring')).toEqual(['greet']);
    expect(searchIndex(ix, 'hasownproperty valueof')).toEqual([]);
  });
});
