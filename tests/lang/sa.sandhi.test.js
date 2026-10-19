import { describe, it, expect } from 'vitest';
import { undoSandhi, splitWords } from '../../src/lang/sa/sandhi.js';
import { cleanSa } from '../../src/lang/sa/script.js';

const tok = (surface, start = 0) => ({ surface, kind: 'word', key: surface, start, end: start + surface.length, enclitic: null, clause: 0 });
// keys normalised as the build normalises them (cleanSa: सञ्जय = संजय)
const lexicon = (known0) => { const known = known0.map(cleanSa); return { lookupAll: async (keys) => new Map(keys.map((k) => [k, known.includes(k) ? [{}] : []])) }; };

describe('Sanskrit sandhi undone at the word end', () => {
  it('-o before a voiced sound was -aḥ; -r was -ḥ; a voiced final stop was voiceless', () => {
    expect(undoSandhi('रामो')).toContain('रामः');
    expect(undoSandhi('हरिर्')).toContain('हरिः');
    expect(undoSandhi('वाग्')).toContain('वाक्');
    expect(undoSandhi('तद्')).toContain('तत्');
  });
  it('a dropped visarga: -a before a vowel may be -aḥ', () => expect(undoSandhi('राम')).toContain('रामः'));
  it('splitWords keeps known words, re-keys a sandhi form, splits at the avagraha', async () => {
    const out = await splitWords([tok('रामो'), tok('गच्छति', 5), tok('रामोऽपि', 12)], lexicon(['रामः', 'गच्छति', 'अपि']));
    expect(out.map((t) => [t.surface, t.key])).toEqual([['रामो', 'रामः'], ['गच्छति', 'गच्छति'], ['रामो', 'रामः'], ['ऽपि', 'अपि']]);
  });
});
describe('Sanskrit words written together', () => {
  it('an unknown word splits in two known ones, the first with its sandhi undone (हरिर्जयति = हरिः + जयति)', async () => {
    const out = await splitWords([tok('हरिर्जयति')], lexicon(['हरिः', 'जयति']));
    expect(out.map((t) => [t.surface, t.key])).toEqual([['हरिर्', 'हरिः'], ['जयति', 'जयति']]);
  });
  it('a word that does not split stays whole', async () => {
    const out = await splitWords([tok('अज्ञात')], lexicon(['जयति']));
    expect(out.map((t) => t.surface)).toEqual(['अज्ञात']);
  });
});
describe('a final consonant joined to the next word’s vowel', () => {
  it('सत्यमेव = सत्यम् + एव', async () => {
    const out = await splitWords([tok('सत्यमेव')], lexicon(['सत्यम्', 'एव']));
    expect(out.map((t) => t.key)).toEqual(['सत्यम्', 'एव']);
    expect(out.map((t) => t.surface).join('')).toBe('सत्यमेव');
  });
});
describe('vowel sandhi across words', () => {
  it('a + ā → ā: रामागच्छति = राम(ः) + आगच्छति', async () => {
    const out = await splitWords([tok('रामागच्छति')], lexicon(['रामः', 'आगच्छति']));
    expect(out.map((t) => t.key)).toEqual(['रामः', 'आगच्छति']);
  });
  it('a + i → e: सूर्येति… and a + u → o: गङ्गोदकम्', async () => {
    expect((await splitWords([tok('गङ्गोदकम्')], lexicon(['गङ्गा', 'उदकम्']))).map((t) => t.key)).toEqual([cleanSa('गङ्गा'), 'उदकम्']);
  });
  it('i + a → ya: इत्यादि = इति + आदि', async () => {
    expect((await splitWords([tok('इत्यादि')], lexicon(['इति', 'आदि']))).map((t) => t.key)).toEqual(['इति', 'आदि']);
  });
});
describe('more sandhi', () => {
  it('visarga before c is ś: three words पाण्डवाश्चैव = पाण्डवाः + च + एव', async () => {
    const out = await splitWords([tok('पाण्डवाश्चैव')], lexicon(['पाण्डवाः', 'च', 'एव']));
    expect(out.map((t) => t.key)).toEqual([cleanSa('पाण्डवाः'), 'च', 'एव']);
  });
});
describe('a one-letter word at the end', () => {
  it('रामश्च = रामः + च', async () => expect((await splitWords([tok('रामश्च')], lexicon(['रामः', 'च']))).map((t) => t.key)).toEqual(['रामः', 'च']));
});
