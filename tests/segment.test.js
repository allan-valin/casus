import { describe, it, expect } from 'vitest';
import { segment } from '../src/lib/segment.js';

describe('segment', () => {
  it('splits on sentence-final punctuation', () => {
    const s = segment('Gallia est omnis divisa. Hi omnes differunt.');
    expect(s).toHaveLength(2);
    expect(s[0].text).toBe('Gallia est omnis divisa.');
  });

  it('keeps ranges pointing into the original text', () => {
    const text = 'Alpha. Beta.';
    const [, second] = segment(text);
    expect(text.slice(second.start, second.end)).toBe(second.text);
  });

  it('does not split on praenomen abbreviations', () => {
    expect(segment('Cn. Pompeius consul erat.')).toHaveLength(1);
  });

  it('does not split inside a date formula', () => {
    expect(segment('Venit a.d. III Kal. Apr. cum legione.')).toHaveLength(1);
  });

  it('does not split on an ellipsis', () => {
    expect(segment('Dixit ... deinde tacuit.')).toHaveLength(1);
  });

  it('handles a question mark and an exclamation', () => {
    expect(segment('Quo usque tandem? O tempora!')).toHaveLength(2);
  });

  it('returns an empty array for blank input', () => {
    expect(segment('   ')).toEqual([]);
  });

  it('keeps a closing quotation mark with its sentence', () => {
    const s = segment('"Veni, vidi, vici." Deinde abiit.');
    expect(s).toHaveLength(2);
    expect(s[0].text).toBe('"Veni, vidi, vici."');
  });

  it('keeps text after the last terminator as a sentence of its own', () => {
    const s = segment('Alpha. Beta');
    expect(s.map((x) => x.text)).toEqual(['Alpha.', 'Beta']);
  });

  it('does split after a word spelled only with Roman letters', () => {
    expect(segment('Veni, vidi, vici. Deinde abiit.')).toHaveLength(2);
  });

  it('does not split on a Roman numeral followed by a full stop', () => {
    expect(segment('Legio X. venit in Galliam.')).toHaveLength(1);
  });
});

describe('lines that are their own sentences (Allan, 2026-10-19: slide bullets were glued together)', () => {
  it('a bulleted or numbered line, or a paragraph after a blank line, starts a sentence; a wrapped line does not', () => {
    const t = 'Gallia est omnis\ndivisa in partes tres\n• prima pars\n• secunda pars\n2. tertia\n\nNovus versus sine puncto';
    expect(segment(t).map((s) => s.text)).toEqual(['Gallia est omnis\ndivisa in partes tres', '• prima pars', '• secunda pars', '2. tertia', 'Novus versus sine puncto']);
  });
});
