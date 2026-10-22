import { describe, it, expect } from 'vitest';
import { layoutIssues } from '../../../src/lib/proof/layout.js';
import { corrected } from '../../../src/lib/proof/correct.js';

/* Allan, 2026-10-22 (German proofreading): a missing full stop at the end was not flagged, and a line break followed
 * by a lower-case word did not get "." above and a capital below — LanguageTool treats one line break as the same
 * sentence and leaves the paragraph end alone by default. */
const M = { period: 'Missing full stop', capital: 'Capital letter after a full stop' };

describe('layoutIssues', () => {
  it('a paragraph ending without a full stop gets one', () => {
    const text = 'Ich wohne seit drei Jahren in Leipzig';
    const out = layoutIssues(text, { messages: M });
    expect(out).toHaveLength(1);
    expect(out[0]).toMatchObject({ categoryId: 'PUNCTUATION', message: M.period });
    expect(corrected(text, out).text).toBe('Ich wohne seit drei Jahren in Leipzig.');
  });
  it('a line break followed by lower case: "." above and a capital below', () => {
    const text = 'Ich wohne in Leipzig\nmeine Wohnung ist klein.';
    const out = layoutIssues(text, { messages: M });
    expect(out.map((i) => i.categoryId)).toEqual(['PUNCTUATION', 'CASING']);
    expect(corrected(text, out).text).toBe('Ich wohne in Leipzig.\nMeine Wohnung ist klein.');
  });
  it('leaves alone: finished sentences, short headings, lines ending in other punctuation, and long wrapped lines', () => {
    expect(layoutIssues('Das ist gut. Wirklich!', { messages: M })).toEqual([]);
    expect(layoutIssues('Kapitel eins\n\nDas Haus ist alt.', { messages: M })).toEqual([]);
    expect(layoutIssues('Ich kaufe:\nbrot und milch.', { messages: M })).toEqual([]);
    const wrapped = 'Dies ist eine sehr lange Zeile aus einem Text, der beim Einfügen umgebrochen wurde und\nweitergeht.';
    expect(layoutIssues(wrapped, { messages: M })).toEqual([]);
  });
  it('a line break followed by an upper-case word only needs the full stop', () => {
    const text = 'Ich wohne in Leipzig\nMeine Wohnung ist klein.';
    expect(corrected(text, layoutIssues(text, { messages: M })).text).toBe('Ich wohne in Leipzig.\nMeine Wohnung ist klein.');
  });
  it('scripts without capitals or with their own full stop are skipped', () => {
    expect(layoutIssues('私は学生です', { messages: M, code: 'ja' })).toEqual([]);
    expect(layoutIssues('أنا أسكن في لايبزيغ منذ سنوات', { messages: M, code: 'ar' }).map((i) => i.categoryId)).toEqual(['PUNCTUATION']);
  });
});
