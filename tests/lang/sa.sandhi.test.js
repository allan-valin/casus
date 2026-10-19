import { describe, it, expect } from 'vitest';
import { undoSandhi, splitWords } from '../../src/lang/sa/sandhi.js';

const tok = (surface, start = 0) => ({ surface, kind: 'word', key: surface, start, end: start + surface.length, enclitic: null, clause: 0 });
const lexicon = (known) => ({ lookupAll: async (keys) => new Map(keys.map((k) => [k, known.includes(k) ? [{}] : []])) });

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
