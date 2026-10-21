import { describe, it, expect } from 'vitest';
import { mkPhonemes, phonemeIds } from '../../src/lang/mk/phonemes.js';

/* Macedonian spelling → sounds for the Piper voice (Allan, 2026-10-21: human-like voice, not espeak). */
describe('mkPhonemes', () => {
  it('letters: one letter, one sound (ќ ѓ palatal, ѕ dz, ч tʃ, х x)', () => {
    expect(mkPhonemes('ќерка')).toBe('kʲˈerka');
    expect(mkPhonemes('ѓавол')).toBe('ɡʲˈavol');
    expect(mkPhonemes('ѕвезда')).toBe('dzvˈezda');
    expect(mkPhonemes('чај')).toBe('tʃˈaj');
    expect(mkPhonemes('хор')).toBe('xˈor');
    expect(mkPhonemes('љубов')).toBe('ʎˈubof');
  });
  it('stress on the third syllable from the end, or the first of shorter words', () => {
    expect(mkPhonemes('зборувате')).toBe('zborˈuvate');
    expect(mkPhonemes('благодарам')).toBe('blaɡˈodaram');
    expect(mkPhonemes('добар')).toBe('dˈobar');
    expect(mkPhonemes('Македонија')).toBe('makedˈonija');
  });
  it('final devoicing: б д г з ж в at the end of a word', () => {
    expect(mkPhonemes('леб')).toBe('lˈep');
    expect(mkPhonemes('град')).toBe('ɡrˈat');
    expect(mkPhonemes('Бразил')).toBe('brˈazil');
  });
  it('clitics carry no stress; punctuation is kept', () => {
    expect(mkPhonemes('Зборувате ли англиски?')).toBe('zborˈuvate li ˈanɡliski?');
    expect(mkPhonemes('Од Бразил сум.')).toBe('od brˈazil sum.');
    expect(mkPhonemes('леб и сол')).toBe('lˈep i sˈol');
    expect(mkPhonemes('Да, од Бразил сум.')).toBe('dˈa, od brˈazil sum.');
  });
  it('phoneme ids: ^ _ then each sound and _, then $', () => {
    const map = { '^': [1], _: [0], $: [2], a: [14], ˈ: [120], d: [17] };
    expect(phonemeIds('да', map)).toEqual([1, 0, 17, 0, 120, 0, 14, 0, 2]);
  });
});
