import { describe, it, expect } from 'vitest';
import { buildBlocks, narrow, governmentStage } from '../src/lib/disambiguate.js';
import { GOVERNMENT } from '../src/lib/prepositions.js';

const inPrep = [{ lemma: 'in:prep:1', pos: 'prep' }];
const galliam = [
  { lemma: 'gall:noun:1', pos: 'noun', case: 'acc', number: 'sg', gender: 'f' },
];
const urbe = [
  { lemma: 'urb:noun:1', pos: 'noun', case: 'abl', number: 'sg', gender: 'f' },
];
const ambiguous = [
  { lemma: 'x:noun:1', pos: 'noun', case: 'acc', number: 'sg', gender: 'f' },
  { lemma: 'x:noun:1', pos: 'noun', case: 'abl', number: 'sg', gender: 'f' },
  { lemma: 'x:noun:1', pos: 'noun', case: 'dat', number: 'sg', gender: 'f' },
];

function blocksFor(pairs) {
  const tokens = pairs.map(([key], i) => ({
    index: i, surface: key, key, kind: 'word', enclitic: null,
  }));
  return buildBlocks(tokens, new Map(pairs));
}

describe('GOVERNMENT', () => {
  it('lists the cases every key governs, u for v', () => {
    expect(GOVERNMENT.in).toEqual(['acc', 'abl']);
    expect(GOVERNMENT.cum).toEqual(['abl']);
    expect(Object.keys(GOVERNMENT).every((k) => !/[jv]/.test(k))).toBe(true);
  });
});

describe('governmentStage', () => {
  it('narrows the object to a case the preposition governs', () => {
    const out = narrow(blocksFor([['in', inPrep], ['x', ambiguous]]), governmentStage);
    const cases = out[1].candidates.map((c) => c.analysis.case).sort();
    expect(cases).toEqual(['abl', 'acc']); // dative eliminated
  });

  it('resolves the preposition from an unambiguous object', () => {
    const out = narrow(blocksFor([['in', inPrep], ['galliam', galliam]]), governmentStage);
    expect(out[0].candidates[0].analysis.governs).toEqual(['acc']);
    expect(out[0].candidates[0].reasons.join(' ')).toMatch(/government.*galliam/);
    expect(out[1].candidates[0].reasons.join(' ')).toMatch(/government.*in/);
  });

  it('resolves in + ablative object to the ablative sense', () => {
    const out = narrow(blocksFor([['in', inPrep], ['urbe', urbe]]), governmentStage);
    expect(out[0].candidates[0].analysis.governs).toEqual(['abl']);
  });

  it('leaves both ambiguous when neither settles the other', () => {
    const out = narrow(blocksFor([['in', inPrep], ['x', ambiguous]]), governmentStage);
    expect(out[0].candidates[0].analysis.governs).toEqual(['acc', 'abl']);
  });

  it('applies an unambiguous preposition without needing agreement', () => {
    const out = narrow(blocksFor([['cum', [{ lemma: 'cum:prep:1', pos: 'prep' }]],
                                  ['x', ambiguous]]), governmentStage);
    expect(out[1].candidates.map((c) => c.analysis.case)).toEqual(['abl']);
  });

  it('never empties an object that matches no governed case', () => {
    const genOnly = [{ lemma: 'y:noun:1', pos: 'noun', case: 'gen', number: 'sg', gender: 'f' }];
    const out = narrow(blocksFor([['cum', [{ lemma: 'cum:prep:1', pos: 'prep' }]],
                                  ['y', genOnly]]), governmentStage);
    expect(out[1].candidates).toHaveLength(1);
  });

  it('falls back to what the lexicon says a preposition not in the table governs', () => {
    const tenus = [{ lemma: 'tenus:prep:1', pos: 'prep', governs: 'abl' }];
    const out = narrow(blocksFor([['tenus', tenus], ['x', ambiguous]]), governmentStage);
    expect(out[0].candidates[0].analysis.governs).toEqual(['abl']);
    expect(out[1].candidates.map((c) => c.analysis.case)).toEqual(['abl']);
  });

  it('narrows an adjective standing between the preposition and its noun', () => {
    const magnam = [
      { lemma: 'magn:adj:1', pos: 'adj', case: 'acc', number: 'sg', gender: 'f' },
      { lemma: 'magn:adj:1', pos: 'adj', case: 'gen', number: 'pl', gender: 'f' },
    ];
    const out = narrow(blocksFor([['in', inPrep], ['magnam', magnam], ['urbem', galliam]]), governmentStage);
    expect(out[1].candidates.map((c) => c.analysis.case)).toEqual(['acc']);
  });

  it('is idempotent', () => {
    const once = narrow(blocksFor([['in', inPrep], ['galliam', galliam]]), governmentStage);
    const twice = narrow(once, governmentStage);
    expect(twice).toEqual(once);
  });

  it('does nothing to a sentence without prepositions', () => {
    const blocks = blocksFor([['x', ambiguous]]);
    expect(narrow(blocks, governmentStage)).toEqual(blocks);
  });
});

describe('government links', () => {
  it('links the object to its preposition and the preposition to its object by token index', () => {
    const out = narrow(blocksFor([['in', inPrep], ['galliam', galliam]]), governmentStage);
    expect(out[1].candidates[0].links).toEqual([{ kind: 'government', index: 0 }]);
    expect(out[0].candidates[0].links).toEqual([{ kind: 'government', index: 1 }]);
  });
  it('an object narrowed but not settling the preposition still links to it', () => {
    const out = narrow(blocksFor([['in', inPrep], ['x', ambiguous]]), governmentStage);
    for (const c of out[1].candidates) expect(c.links).toEqual([{ kind: 'government', index: 0 }]);
    expect(out[0].candidates[0].links).toEqual([]);
  });
});

describe('government and indeclinables', () => {
  it('keeps a case-x reading beside the governed one instead of dropping it', () => {
    const mixed = [
      { lemma: 'x:noun:1', pos: 'noun', case: 'acc', number: 'sg', gender: 'f' },
      { lemma: 'x:noun:9', pos: 'noun', case: 'x', number: 'x', gender: 'f' },
    ];
    const out = narrow(blocksFor([['in', inPrep], ['x', mixed]]), governmentStage);
    expect(out[1].candidates.map((c) => c.analysis.case).sort()).toEqual(['acc', 'x']);
  });
});

describe('government over the noun phrase (German, languages phase 3 Task 4)', () => {
  const N = (c, n = 'sg', g = 'm', pos = 'noun') => ({ lemma: 'x', pos, case: c, number: n, gender: g });
  const tok = (i, s) => ({ index: i, surface: s, key: s, kind: 'word' });
  const GOV = { mit: ['dat'], in: ['acc', 'dat'], an: ['acc', 'dat'] };
  async function run(words, analyses) {
    const { buildBlocks, governmentStage, narrow } = await import('../src/lib/disambiguate.js');
    const blocks = buildBlocks(words.map((w, i) => tok(i, w)), new Map(Object.entries(analyses)));
    return narrow(blocks, (b) => governmentStage(b, GOV, { phrase: true }));
  }
  const cases = (b) => [...new Set(b.candidates.map((c) => c.analysis.case))].sort();

  it('mit dem guten Wein: article, adjective and noun all dative, each linked to mit', async () => {
    const out = await run(['mit', 'dem', 'guten', 'Wein'], {
      mit: [{ lemma: 'p', pos: 'prep', governs: 'dat' }],
      dem: [N('dat', 'sg', 'm', 'det'), N('dat', 'sg', 'n', 'det')],
      guten: [N('dat', 'sg', 'm', 'adj'), N('acc', 'sg', 'm', 'adj'), N('gen', 'sg', 'm', 'adj'), N('nom', 'pl', 'x', 'adj')],
      Wein: [N('nom'), N('dat'), N('acc')],
    });
    expect(out.slice(1).map(cases)).toEqual([['dat'], ['dat'], ['dat']]);
    for (const b of out.slice(1)) expect(b.candidates.every((c) => c.links.some((l) => l.kind === 'government' && l.index === 0))).toBe(true);
  });
  it('in das Haus is accusative and in dem Haus dative: the article settles the preposition', async () => {
    const haus = [N('nom', 'sg', 'n'), N('dat', 'sg', 'n'), N('acc', 'sg', 'n')];
    const prep = [{ lemma: 'p', pos: 'prep', governs: 'acc' }, { lemma: 'p', pos: 'prep', governs: 'dat' }];
    const a = await run(['in', 'das', 'Haus'], { in: prep, das: [N('nom', 'sg', 'n', 'det'), N('acc', 'sg', 'n', 'det')], Haus: haus });
    expect(cases(a[2])).toEqual(['acc']);
    expect(a[0].candidates.map((c) => c.analysis.governs)).toEqual([['acc'], ['acc']]);
    const d = await run(['in', 'dem', 'Haus'], { in: prep, dem: [N('dat', 'sg', 'n', 'det')], Haus: haus });
    expect(cases(d[2])).toEqual(['dat']);
  });
  it('a Wechselpräposition whose phrase allows both stays two-coloured', async () => {
    const out = await run(['an', 'Häuser'], { an: [{ lemma: 'p', pos: 'prep', governs: 'acc' }, { lemma: 'p', pos: 'prep', governs: 'dat' }], Häuser: [N('nom', 'pl', 'n'), N('acc', 'pl', 'n'), N('dat', 'pl', 'n')] });
    expect(cases(out[1])).toEqual(['acc', 'dat']);
    expect([...new Set(out[0].candidates.flatMap((c) => c.analysis.governs))].sort()).toEqual(['acc', 'dat']);
  });
  it('the span stops after the first noun and never crosses a verb', async () => {
    const out = await run(['mit', 'Wein', 'kam', 'Wein'], { mit: [{ lemma: 'p', pos: 'prep', governs: 'dat' }], Wein: [N('nom'), N('dat'), N('acc')], kam: [{ lemma: 'v', pos: 'verb', person: '3', number: 'sg' }] });
    expect(cases(out[1])).toEqual(['dat']);
    expect(cases(out[3])).toEqual(['acc', 'dat', 'nom']);
  });
});

describe('phrase government stops where the phrase does (review I1)', () => {
  const N = (c, n = 'sg', g = 'm', pos = 'noun') => ({ lemma: 'x', pos, case: c, number: n, gender: g });
  const tok = (i, s) => ({ index: i, surface: s, key: s, kind: 'word' });
  async function run(words, analyses) {
    const { buildBlocks, governmentStage, narrow } = await import('../src/lib/disambiguate.js');
    const blocks = buildBlocks(words.map((w, i) => tok(i, w)), new Map(Object.entries(analyses)));
    return narrow(blocks, (b) => governmentStage(b, { mit: ['dat'], für: ['acc'] }, { phrase: true }));
  }
  const cases = (b) => [...new Set(b.candidates.map((c) => c.analysis.case))].sort();
  it('mit ihm Fußball spielen: ihm is the object, Fußball keeps its cases', async () => {
    const out = await run(['mit', 'ihm', 'Fußball', 'spielen'], {
      mit: [{ lemma: 'p', pos: 'prep', governs: 'dat' }], ihm: [N('dat', 'sg', 'm', 'pron')],
      Fußball: [N('nom'), N('dat'), N('acc')], spielen: [{ lemma: 'v', pos: 'verb' }],
    });
    expect(cases(out[1])).toEqual(['dat']);
    expect(cases(out[2])).toEqual(['acc', 'dat', 'nom']);
    expect(out[2].candidates.some((c) => c.links.some((l) => l.kind === 'government'))).toBe(false);
  });
  it('a member with no reading in the governed cases ends the phrase (it is not skipped)', async () => {
    const out = await run(['mit', 'das', 'Buch'], {
      mit: [{ lemma: 'p', pos: 'prep', governs: 'dat' }], das: [N('nom', 'sg', 'n', 'det'), N('acc', 'sg', 'n', 'det')],
      Buch: [N('nom', 'sg', 'n'), N('dat', 'sg', 'n'), N('acc', 'sg', 'n')],
    });
    expect(cases(out[2])).toEqual(['acc', 'dat', 'nom']);
  });
});
