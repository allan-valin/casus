import { describe, it, expect } from 'vitest';
import { typeOf, corrected, shiftIssues } from '../../../src/lib/proof/correct.js';

describe('issue types (colours)', () => {
  it('spelling, grammar, punctuation, style, casing', () => {
    expect(typeOf({ kind: 'spelling' })).toBe('spelling');
    expect(typeOf({ kind: 'grammar', categoryId: 'TYPOS' })).toBe('spelling');
    expect(typeOf({ kind: 'grammar', categoryId: 'GRAMMAR' })).toBe('grammar');
    expect(typeOf({ kind: 'grammar', categoryId: 'PUNCTUATION' })).toBe('punctuation');
    expect(typeOf({ kind: 'grammar', categoryId: 'TYPOGRAPHY' })).toBe('punctuation');
    expect(typeOf({ kind: 'grammar', categoryId: 'STYLE' })).toBe('style');
    expect(typeOf({ kind: 'grammar', categoryId: 'CASING' })).toBe('casing');
  });
});

describe('the corrected text', () => {
  it('takes each issue’s first suggestion, and says where the changes are in the new text', () => {
    const text = 'Eu vi as casa e nao sabia.';
    const r = corrected(text, [{ offset: 6, length: 7, replacements: ['as casas'] }, { offset: 16, length: 3, replacements: ['não'] }, { offset: 0, length: 2, replacements: [] }]);
    expect(r.text).toBe('Eu vi as casas e não sabia.');
    expect(r.changes.map((c) => r.text.slice(c.offset, c.offset + c.length))).toEqual(['as casas', 'não']);
  });
});

describe('marks follow the text while it is typed', () => {
  it('an edit before a mark moves it; an edit inside one drops it', () => {
    const issues = [{ offset: 6, length: 7 }, { offset: 16, length: 3 }];
    expect(shiftIssues('Eu vi as casa e nao sabia.', 'Ontem eu vi as casa e nao sabia.', issues).map((i) => i.offset)).toEqual([12, 22]);
    expect(shiftIssues('Eu vi as casa e nao sabia.', 'Eu vi as casxa e nao sabia.', issues).map((i) => i.offset)).toEqual([17]);
  });
});
