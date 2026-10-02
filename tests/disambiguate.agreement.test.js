import { describe, it, expect } from 'vitest';
import { buildBlocks, narrow, agreementStage } from '../src/lib/disambiguate.js';

const magnam = [
  { lemma: 'magn:adj:1', pos: 'adj', case: 'acc', number: 'sg', gender: 'f' },
  { lemma: 'magn:adj:1', pos: 'adj', case: 'gen', number: 'pl', gender: 'f' },
];
const urbem = [
  { lemma: 'urb:noun:1', pos: 'noun', case: 'acc', number: 'sg', gender: 'f' },
];
const rosa = [
  { lemma: 'ros:noun:1', pos: 'noun', case: 'nom', number: 'sg', gender: 'f' },
  { lemma: 'ros:noun:1', pos: 'noun', case: 'abl', number: 'sg', gender: 'f' },
];

function blocksFor(pairs) {
  const tokens = pairs.map(([key], i) => ({
    index: i, surface: key, key, kind: 'word', enclitic: null,
  }));
  return buildBlocks(tokens, new Map(pairs));
}

describe('agreementStage', () => {
  it('narrows an adjective to the reading that agrees with a resolved noun', () => {
    const out = narrow(blocksFor([['magnam', magnam], ['urbem', urbem]]), agreementStage);
    expect(out[0].candidates).toHaveLength(1);
    expect(out[0].candidates[0].analysis.case).toBe('acc');
  });

  it('records why the candidate survived, naming the token', () => {
    const out = narrow(blocksFor([['magnam', magnam], ['urbem', urbem]]), agreementStage);
    const reasons = out[0].candidates[0].reasons.join(' ');
    expect(reasons).toMatch(/agree/i);
    expect(reasons).toMatch(/urbem/);
  });

  it('leaves both ambiguous when nothing agrees', () => {
    const out = narrow(blocksFor([['rosa', rosa]]), agreementStage);
    expect(out[0].candidates).toHaveLength(2);
  });

  it('does not treat two nouns as an agreement pair by accident', () => {
    const out = narrow(blocksFor([['rosa', rosa], ['urbem', urbem]]), agreementStage);
    expect(out[0].candidates).toHaveLength(2);
  });

  it('is idempotent', () => {
    const once = narrow(blocksFor([['magnam', magnam], ['urbem', urbem]]), agreementStage);
    const twice = narrow(once, agreementStage);
    expect(twice[0].candidates).toHaveLength(1);
    expect(twice[0].candidates[0].reasons).toEqual(once[0].candidates[0].reasons);
  });

  it('leaves an adjective untouched when no nominal in the sentence agrees', () => {
    const out = narrow(blocksFor([['magnam', magnam], ['rosa', rosa]]), agreementStage);
    expect(out[0].candidates).toHaveLength(2);
    expect(out[0].candidates[0].reasons).toEqual(['lexicon: attested form']);
  });

  it('treats a common or any-gender ending as agreeing with either gender', () => {
    const fortem = [
      { lemma: 'fort:adj:1', pos: 'adj', case: 'acc', number: 'sg', gender: 'c' },
      { lemma: 'fort:adj:1', pos: 'adj', case: 'gen', number: 'pl', gender: 'x' },
    ];
    const out = narrow(blocksFor([['fortem', fortem], ['urbem', urbem]]), agreementStage);
    expect(out[0].candidates.map((c) => c.analysis.case)).toEqual(['acc']);
  });

  it('narrows a participle the same way', () => {
    const captam = [
      { lemma: 'capi:verb:1', pos: 'vpar', case: 'acc', number: 'sg', gender: 'f', tense: 'perf', voice: 'pass', conj: '3-io' },
      { lemma: 'capi:verb:1', pos: 'vpar', case: 'gen', number: 'pl', gender: 'f', tense: 'perf', voice: 'pass', conj: '3-io' },
    ];
    const out = narrow(blocksFor([['urbem', urbem], ['captam', captam]]), agreementStage);
    expect(out[1].candidates.map((c) => c.analysis.case)).toEqual(['acc']);
  });

  it('lets a resolved adjective narrow an ambiguous noun, but not an ambiguous one', () => {
    const urbemOrUrbibus = [
      { lemma: 'urb:noun:1', pos: 'noun', case: 'acc', number: 'sg', gender: 'f' },
      { lemma: 'urb:noun:1', pos: 'noun', case: 'dat', number: 'pl', gender: 'f' },
    ];
    const settled = narrow(blocksFor([['magnam', [magnam[0]]], ['urbem', urbemOrUrbibus]]), agreementStage);
    expect(settled[1].candidates.map((c) => c.analysis.case)).toEqual(['acc']);
    expect(settled[1].candidates[0].reasons.join(' ')).toMatch(/magnam/);
    const open = narrow(blocksFor([['magnam', magnam], ['urbem', urbemOrUrbibus]]), agreementStage);
    expect(open[1].candidates).toHaveLength(2);
  });

  it('prefers a resolved noun over an ambiguous one as the witness', () => {
    const magna = [
      { lemma: 'magn:adj:1', pos: 'adj', case: 'nom', number: 'sg', gender: 'f' },
      { lemma: 'magn:adj:1', pos: 'adj', case: 'abl', number: 'sg', gender: 'f' },
      { lemma: 'magn:adj:1', pos: 'adj', case: 'nom', number: 'pl', gender: 'n' },
    ];
    const urbs = [{ lemma: 'urb:noun:1', pos: 'noun', case: 'nom', number: 'sg', gender: 'f' }];
    const out = narrow(blocksFor([['magna', magna], ['rosa', rosa], ['urbs', urbs]]), agreementStage);
    expect(out[0].candidates.map((c) => c.analysis.case)).toEqual(['nom']);
    expect(out[0].candidates[0].reasons.join(' ')).toMatch(/urbs/);
  });
});

describe('agreementStage on noun/adjective homographs', () => {
  const senatus = [
    { lemma: 'senat:noun:1', pos: 'noun', case: 'nom', number: 'sg', gender: 'm' },
    { lemma: 'senat:noun:1', pos: 'noun', case: 'gen', number: 'sg', gender: 'm' },
    { lemma: 'senat:adj:2', pos: 'adj', case: 'nom', number: 'sg', gender: 'm', degree: 'pos' },
  ];
  const populus = [{ lemma: 'popul:noun:1', pos: 'noun', case: 'nom', number: 'sg', gender: 'm' }];

  it('keeps the noun readings beside the adjective reading agreement supports', () => {
    const out = narrow(blocksFor([['senatus', senatus], ['populus', populus]]), agreementStage);
    const kinds = out[0].candidates.map((c) => `${c.analysis.pos} ${c.analysis.case}`);
    expect(kinds).toEqual(['adj nom', 'noun nom', 'noun gen']);
  });

  it('keeps a verb reading beside an agreeing adjective reading', () => {
    const bona = [
      { lemma: 'bon:adj:1', pos: 'adj', case: 'nom', number: 'sg', gender: 'f', degree: 'pos' },
      { lemma: 'bon:adj:1', pos: 'adj', case: 'abl', number: 'sg', gender: 'f', degree: 'pos' },
      { lemma: 'bon:verb:9', pos: 'verb', person: '2', number: 'sg', tense: 'pres', mood: 'imp', voice: 'act', conj: '1' },
    ];
    const rosaNom = [{ lemma: 'ros:noun:1', pos: 'noun', case: 'nom', number: 'sg', gender: 'f' }];
    const out = narrow(blocksFor([['bona', bona], ['rosa', rosaNom]]), agreementStage);
    expect(out[0].candidates.map((c) => c.analysis.pos)).toEqual(['adj', 'verb']);
    expect(out[0].candidates[0].analysis.case).toBe('nom');
  });
});

describe('agreement links', () => {
  it('records the witness token index on the surviving candidate', () => {
    const out = narrow(blocksFor([['magnam', magnam], ['urbem', urbem]]), agreementStage);
    expect(out[0].candidates[0].links).toEqual([{ kind: 'agreement', index: 1 }]);
  });
  it('a candidate the lexicon alone kept has no links', () => {
    const out = narrow(blocksFor([['rosa', rosa]]), agreementStage);
    expect(out[0].candidates[0].links).toEqual([]);
  });
});
