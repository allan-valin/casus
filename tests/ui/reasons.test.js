import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { reasonText } from '../../src/app/lib/reasons.js';

// every reason the parsers gave on the sample texts (node tools/collect_reasons.mjs > tests/fixtures/reasons.json)
const REASONS = Object.keys(JSON.parse(readFileSync(new URL('../fixtures/reasons.json', import.meta.url), 'utf8')));
// reasons made only of the text's own words and role tags (zh "X: loc") need no translation
const NOTHING_TO_TRANSLATE = (r) => /^\S+: [a-z]{2,4}$/.test(r);

describe('reasons in the interface language (open item 2026-10-21: candidate reasons stayed English)', () => {
  it('English stays as it is', () => {
    expect(reasonText('lexicon: attested form', 'en')).toBe('lexicon: attested form');
  });
  it('keeps the words of the text and translates case and number names', () => {
    expect(reasonText('government: in + acc (object partes is accusative)', 'pt')).toBe('regência: in + acc (o objeto partes está no acusativo)');
    expect(reasonText('clause: its verb est is singular, so a nominative here is too', 'de')).toBe('Satz: sein Verb est steht im Singular, also auch ein Nominativ hier');
    expect(reasonText('clause: the subject here is 1st person or 3rd person', 'mk')).toBe('реченица: подметот тука е 1 лице или 3 лице');
    expect(reasonText('subject Hún: 3rd person', 'ar')).toBe('الفاعل Hún: الشخص 3');
  });
  it('an unknown reason stays English rather than vanishing', () => {
    expect(reasonText('something new', 'pt')).toBe('something new');
  });
  for (const lang of ['pt', 'de', 'mk', 'ar']) {
    it(`every reason the parsers give on the samples is translated into ${lang}`, () => {
      const missing = REASONS.filter((r) => !NOTHING_TO_TRANSLATE(r) && reasonText(r, lang) === r);
      expect(missing).toEqual([]);
    });
  }
});
