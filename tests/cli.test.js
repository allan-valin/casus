import { describe, it, expect } from 'vitest';
import { formatBlocks } from '../tools/parse_cli.mjs';

const block = {
  token: { index: 0, surface: 'rosa' },
  pinned: null,
  resolved: false,
  candidates: [
    { analysis: { lemma: '33803', pos: 'noun', case: 'nom', number: 'sg', gender: 'f' },
      reasons: ['lexicon: attested form'] },
    { analysis: { lemma: '33803', pos: 'noun', case: 'abl', number: 'sg', gender: 'f' },
      reasons: ['lexicon: attested form'] },
  ],
};

describe('formatBlocks', () => {
  it('marks an ambiguous block and lists every candidate', () => {
    const out = formatBlocks([block]);
    expect(out).toMatch(/rosa/);
    expect(out).toMatch(/\?/);
    expect(out).toMatch(/nom sg/);
    expect(out).toMatch(/abl sg/);
  });

  it('prints a resolved block without the ambiguity marker', () => {
    const resolved = { ...block, resolved: true, candidates: [block.candidates[0]] };
    expect(formatBlocks([resolved])).not.toMatch(/\?/);
  });

  it('reports an unknown word explicitly', () => {
    const unknown = { ...block, candidates: [], resolved: false };
    expect(formatBlocks([unknown])).toMatch(/not in lexicon/i);
  });

  it('prints the headword when a lemma table is given', () => {
    const lemmas = { 33803: { headword: 'rosa', dict_form: 'rosa, -ae f.' } };
    expect(formatBlocks([block], lemmas)).toMatch(/rosa, -ae f\./);
  });

  it('prints every reason beside its candidate', () => {
    const reasoned = { ...block, candidates: [{ ...block.candidates[0], reasons: ['lexicon: attested form', 'agreement: matches urbem (acc sg f)'] }] };
    expect(formatBlocks([reasoned])).toMatch(/agreement: matches urbem/);
  });

  it('spells a verb reading as person number tense mood voice', () => {
    const verb = { ...block, resolved: true, candidates: [{ analysis: { lemma: '1', pos: 'verb', person: '3', number: 'sg', tense: 'perf', mood: 'ind', voice: 'act', conj: '4' }, reasons: ['lexicon: attested form'] }] };
    expect(formatBlocks([verb])).toMatch(/verb 3 sg perf ind act/);
  });
});

describe('formatBlocks merges identical readings', () => {
  it('prints one line with a count when several lemmas give the same reading and headword', () => {
    const same = (lemma) => ({ analysis: { lemma, pos: 'verb', person: '3', number: 'sg', tense: 'pres', mood: 'ind', voice: 'act', conj: '6' }, reasons: ['lexicon: attested form'] });
    const et = { token: { index: 1, surface: 'et' }, pinned: null, resolved: false,
      candidates: [same('1'), same('2'), same('3'),
        { analysis: { lemma: '4', pos: 'conj' }, reasons: ['lexicon: attested form'] }] };
    const lemmas = { 1: { dict_form: 'eo, -ire' }, 2: { dict_form: 'eo, -ire' }, 3: { dict_form: 'eo, -ire' }, 4: { dict_form: 'et' } };
    const out = formatBlocks([et], lemmas);
    expect(out.split('\n')).toHaveLength(3);
    expect(out).toMatch(/eo, -ire> ×3/);
    expect(out).toMatch(/conj <et>/);
  });

  it('does not merge readings whose reasons differ', () => {
    const a = { analysis: { lemma: '1', pos: 'noun', case: 'nom', number: 'sg', gender: 'f' }, reasons: ['lexicon: attested form'] };
    const b = { ...a, reasons: ['lexicon: attested form', 'agreement: matches x (nom sg f)'] };
    const out = formatBlocks([{ token: { index: 0, surface: 'rosa' }, pinned: null, resolved: false, candidates: [a, b] }]);
    expect(out.split('\n')).toHaveLength(3);
  });
});
