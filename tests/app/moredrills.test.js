import { describe, it, expect } from 'vitest';
import { clozeItems, whoItems, spotItems, binItems, soundItems, pairItems, matchRounds, agreementItems } from '../../src/app/lib/moredrills.js';
import { getLanguage } from '../../src/lang/registry.js';

/* The newer drills (docs/DRILLS-RESEARCH-2026-10-20.md items 4, 5, 8, 10, 11, 12, 14, 15), built from data the site
 * already has: the Learn exercise files, sounds.json, bins.json and the endings models. */
const gap = (before, answer, after, extra = {}) => ({ type: 'gap', source: 'tatoeba', furi: [[before, null], ['＿＿', null], [after, null]], en: 'meaning', answer, pool: ['puellae', 'puellis'], ...extra });

describe('inflection cloze (item 4)', () => {
  it('a sentence with its gap, the dictionary word and the meaning; type the form', () => {
    const [it0] = clozeItems([gap('Rosae ', 'puellarum', ' sunt.', { lemma: 'puella' }), gap('x ', 'y', ' z')]);
    expect(it0.prompt).toContain('Rosae ＿＿ sunt.');
    expect(it0.prompt).toContain('(puella)');
    expect(it0.answer).toBe('puellarum');
  });
  it('the dictionary word is the answer itself: nothing to inflect, no question', () => {
    expect(clozeItems([gap('a ', 'puella', ' b', { lemma: 'puella' })])).toEqual([]);
  });
});

describe('who did what to whom (item 5)', () => {
  const q = { type: 'translate', source: 'tatoeba', tok: ['Den', 'Hund', 'sieht', 'der', 'Mann', '.'], roles: { sbj: 4, obj: 1, objFirst: true }, furi: [['Den Hund sieht der Mann.', null]], answer: 'The man sees the dog.' };
  it('the sentence; the doer is the answer, the one done to the wrong answer', () => {
    const [x] = whoItems([q, { ...q, roles: undefined }]);
    expect(x.prompt).toBe('Den Hund sieht der Mann.');
    expect(x.answer).toBe('Mann');
    expect(x.pool).toEqual(['Hund']);
  });
  it('object-first sentences come first (they are the ones that teach the point)', () => {
    const svo = { ...q, roles: { sbj: 4, obj: 1, objFirst: false }, furi: [['other', null]] };
    expect(whoItems([svo, q])[0].prompt).toBe('Den Hund sieht der Mann.');
  });
});

describe('spot and fix the error (item 10)', () => {
  it('one wrong answer put in the gap: the words around it, the wrong word and the right one', () => {
    const [x] = spotItems([gap('Rosae ', 'puellarum', ' sunt.')], () => 0);
    expect(x.wrong).toBe('puellae');
    expect(x.right).toBe('puellarum');
    expect(x.words.map((w) => w.text)).toEqual(['Rosae', 'puellae', 'sunt.']);
    expect(x.words.filter((w) => w.bad).map((w) => w.text)).toEqual(['puellae']);
  });
  it('a pool option that is the answer in another case (Puellarum / puellarum) is no error', () => {
    expect(spotItems([gap('a ', 'Puellae', ' b', { pool: ['puellae'] })], () => 0)).toEqual([]);
  });
});

describe('sort into bins (item 12)', () => {
  it('each noun to its gender; the bins are the choices', () => {
    const items = binItems({ kind: 'gender', bins: ['m', 'f'], items: [{ w: 'Mann', en: 'man', bin: 'm' }] }, { m: 'masculine', f: 'feminine' });
    expect(items[0]).toMatchObject({ prompt: 'Mann', answer: 'masculine', pool: ['feminine'], hint: 'man' });
  });
});

const SOUNDS = { words: [{ w: 'Haus', ipa: '/haʊ̯s/', en: 'house' }, { w: 'Maus', ipa: '/maʊ̯s/', en: 'mouse' }, { w: 'Mann', ipa: '/man/', en: 'man' }, { w: 'Staat', ipa: '/ʃtaːt/', en: 'state' }, { w: 'Stadt', ipa: '/ʃtat/', en: 'city' }], pairs: [[0, 1], [3, 4]] };

describe('sound ↔ spelling (item 14)', () => {
  it('IPA to word: the minimal-pair partner is among the wrong answers', () => {
    const haus = soundItems(SOUNDS, 'word').find((i) => i.answer === 'Haus');
    expect(haus.prompt).toBe('/haʊ̯s/');
    expect(haus.pool).toContain('Maus');
  });
  it('word to IPA: the answers are transcriptions', () => {
    const staat = soundItems(SOUNDS, 'ipa').find((i) => i.prompt === 'Staat');
    expect(staat.answer).toBe('/ʃtaːt/');
    expect(staat.pool).toContain('/ʃtat/');
  });
});

describe('minimal-pair listening (item 8)', () => {
  it('each pair, one of its two words to be spoken', () => {
    const items = pairItems(SOUNDS, () => 0.9);
    expect(items).toHaveLength(2);
    expect(items[0].options.map((o) => o.w).sort()).toEqual(['Haus', 'Maus']);
    expect(items[0].options.map((o) => o.w)).toContain(items[0].say.w);
  });
});

describe('matching grid (item 15)', () => {
  it('rounds of five pairs, the right column shuffled', () => {
    const items = Array.from({ length: 12 }, (_, k) => ({ w: `w${k}`, en: `m${k}` }));
    const rounds = matchRounds(items, 5, () => 0);
    expect(rounds).toHaveLength(2);
    expect(rounds[0].left).toHaveLength(5);
    expect(rounds[0].right.map((r) => r.en).sort()).toEqual(rounds[0].left.map((l) => l.en).sort());
  });
});

describe('agreement builder (item 11)', () => {
  const la = getLanguage('la');
  const bonus = { id: '10', headword: 'bonus', pos: 'adj', rows: [['bonus', 'ansmp'], ['bona', 'ansfp', 'anpnp'], ['bonum', 'aasmp', 'aasnp'], ['bonam', 'aasfp'], ['boni', 'agsmp'], ['bonae', 'agsfp']] };
  const rosa = { id: '1', headword: 'rosa', pos: 'noun', rows: [['rosa', 'nnsf'], ['rosam', 'nasf'], ['rosae', 'ngsf']] };
  it('adjective and noun into one case and number: the noun’s gender picks the adjective’s form', () => {
    const items = agreementItems([bonus, rosa], la, (c) => c, (n) => n);
    const acc = items.find((i) => i.answer.endsWith('rosam'));
    expect(acc.answer).toBe('bonam rosam');
    expect(acc.prompt).toContain('bonus');
    expect(acc.prompt).toContain('rosa');
    expect(acc.pool).toContain('bonum rosam');
    expect(acc.pool).not.toContain('bonam rosam');
  });
});

describe('learnSample: some Learn lessons and their questions, for the drills that use real sentences', () => {
  it('reads n grammar lessons (not word lists) and their question files', async () => {
    const { learnSample } = await import('../../src/app/lib/moredrills.js');
    const index = { levels: [{ id: 'A1', topics: [{ kind: 'grammar', lessons: [{ id: 'a' }, { id: 'b' }] }, { kind: 'vocab', lessons: [{ id: 'v' }] }] }] };
    const files = { learn: index, 'learn/a': { more: [{ text: 'x', en: 'y' }] }, 'learn/b': {}, 'learn/q-a': { qs: [{ type: 'gap' }] }, 'learn/q-b': { qs: [{ type: 'translate' }] } };
    const got = await learnSample(async (n) => { if (!(n in files)) throw new Error(n); return files[n]; }, () => 0, 5);
    expect(got.lessons).toHaveLength(2);
    expect(got.qs.map((q) => q.type).sort()).toEqual(['gap', 'translate']);
  });
});

describe('agreement builder: only unambiguous cells', () => {
  it('a cell with several forms (Icelandic: strong, weak and superlative in one cell) is not asked', async () => {
    const la = getLanguage('la');
    const bonus = { id: '10', headword: 'bonus', pos: 'adj', rows: [['bonam', 'aasfp'], ['optimam', 'aasfp'], ['bonae', 'agsfp']] };
    const rosa = { id: '1', headword: 'rosa', pos: 'noun', rows: [['rosam', 'nasf'], ['rosae', 'ngsf']] };
    const items = agreementItems([bonus, rosa], la, (c) => c, (n) => n);
    expect(items.map((i) => i.answer)).toEqual(['bonae rosae']);
  });
});
