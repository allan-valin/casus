import { describe, it, expect } from 'vitest';
import { segments, buildIpaIndex, expectedFor, expectedSounds, bestVariants, align, score, aiPrompt, speakHref } from '../../src/app/lib/pronounce.js';
import { langFromPath, speakPath } from '../../src/app/lib/route.js';

describe('segments', () => {
  it('splits a transcription into sounds, dropping slashes, stress and syllable marks', () => {
    expect(segments('/ˈhaʊ̯s/')).toEqual(['h', 'a', 'ʊ̯', 's']);
  });
  it('keeps length, aspiration and tie bars with their sound', () => {
    expect(segments('[ˈtʰaːt͡sə]')).toEqual(['tʰ', 'aː', 't͡s', 'ə']);
  });
});

describe('expected IPA of a sentence', () => {
  const lemmas = { 1: { headword: 'Haus' }, 2: { headword: 'groß' }, 3: { headword: 'das' } };
  const ipa = { 1: [{ ipa: '/haʊ̯s/', tags: [] }], 2: [{ ipa: '/ɡʁoːs/', tags: [] }], 3: [{ ipa: '/das/', tags: [] }] };
  const index = buildIpaIndex(lemmas, ipa);
  const lookup = async (w) => (w === 'häuser' ? [{ lemma: 1 }] : []);

  it('takes the Wiktionary IPA of a word that is a headword, whatever its case', async () => {
    const [das, haus] = await expectedFor('Das Haus', { index, lookup, lemmas, ipa });
    expect(das).toMatchObject({ word: 'Das', ipa: '/das/', source: 'exact' });
    expect(haus).toMatchObject({ word: 'Haus', ipa: '/haʊ̯s/', source: 'exact' });
  });
  it("marks an inflected word with its lemma's IPA as approximate", async () => {
    const [w] = await expectedFor('Häuser', { index, lookup, lemmas, ipa });
    expect(w).toMatchObject({ source: 'lemma', lemma: 'Haus', ipa: '/haʊ̯s/' });
  });
  it('an inflected form takes its own generated IPA before its lemma (Allan, 2026-10-22: verbs were not conjugated)', async () => {
    const formIpa = async (w) => ({ häuser: 'hɔʏ̯zɐ' })[w] ?? null;
    const [w] = await expectedFor('Häuser', { index, lookup, lemmas, ipa, formIpa });
    expect(w).toMatchObject({ source: 'form', ipa: 'hɔʏ̯zɐ', lemma: 'Haus' });
  });
  it('a word with no lemma either still gets its generated IPA', async () => {
    const [w] = await expectedFor('Xyz', { index, lookup, lemmas, ipa, formIpa: async () => 'ɪks' });
    expect(w).toMatchObject({ source: 'form', ipa: 'ɪks' });
  });
  it('says when a word has no transcription', async () => {
    const [w] = await expectedFor('Xyz', { index, lookup, lemmas, ipa });
    expect(w).toMatchObject({ source: 'none', ipa: null });
  });
  it('ignores punctuation between words', async () => {
    const out = await expectedFor('Das, Haus!', { index, lookup, lemmas, ipa });
    expect(out.map((w) => w.word)).toEqual(['Das', 'Haus']);
  });
});

describe('aligning what was expected with what was heard', () => {
  it('matches identical sounds', () => {
    const pairs = align(['h', 'a', 's'], ['h', 'a', 's']);
    expect(pairs.map((p) => p.op)).toEqual(['ok', 'ok', 'ok']);
  });
  it('flags a substituted, a missing and an added sound', () => {
    expect(align(['h', 'a', 's'], ['h', 'o', 's']).map((p) => p.op)).toEqual(['ok', 'sub', 'ok']);
    expect(align(['h', 'a', 's'], ['h', 's']).map((p) => p.op)).toEqual(['ok', 'del', 'ok']);
    expect(align(['h', 's'], ['h', 'a', 's']).map((p) => p.op)).toEqual(['ok', 'ins', 'ok']);
  });
  it('counts a sound that differs only in a diacritic or length, or a close vowel, as near', () => {
    expect(align(['aː'], ['a'])[0].op).toBe('near');
    expect(align(['ɛ'], ['e'])[0].op).toBe('near');
    expect(align(['ʁ'], ['r'])[0].op).toBe('near');
  });
  it('lets a word without a transcription absorb whatever was heard there', () => {
    const pairs = align(['d', 'a', '*', 'h', 'a'], ['d', 'a', 'x', 'y', 'h', 'a']);
    expect(pairs.filter((p) => p.op === 'wild').map((p) => p.got)).toEqual(['x', 'y']);
    expect(pairs.filter((p) => p.op === 'ok')).toHaveLength(4);
  });
});

describe('score', () => {
  it('is the share of expected sounds said right, near counting half', () => {
    expect(score(align(['a', 'b', 'c', 'd'], ['a', 'b', 'c', 'd']))).toBe(100);
    expect(score(align(['a', 'b', 'ɛ', 'd'], ['a', 'b', 'e', 'x']))).toBe(63);
  });
  it('is null when nothing could be compared', () => {
    expect(score(align(['*'], ['a']))).toBeNull();
  });
});

describe('the prompt for an AI assistant', () => {
  it('carries the language, the sentence, both transcriptions and asks for teaching', () => {
    const p = aiPrompt({ language: 'German', sentence: 'Das Haus', expected: '/das haʊ̯s/', heard: 'd a s h a u s', ui: 'en' });
    expect(p).toContain('German');
    expect(p).toContain('Das Haus');
    expect(p).toContain('/das haʊ̯s/');
    expect(p).toContain('d a s h a u s');
    expect(p).toMatch(/how to/i);
  });
  it('is written in the interface language', () => {
    expect(aiPrompt({ language: 'Alemão', sentence: 'x', expected: 'x', heard: 'x', ui: 'pt' })).toMatch(/pronúncia/);
  });
});

describe('the trainer page', () => {
  it('has its own path and route', () => {
    expect(speakPath({ path: '/de/' })).toBe('/de/speak/');
    expect(langFromPath('/de/speak/', '/', [{ code: 'la', path: '/' }, { code: 'de', path: '/de/' }])).toEqual({ code: 'de', view: 'speak' });
  });
  it('links a sentence to the trainer with the text in the address', () => {
    expect(speakHref('/casus/de/speak/', 'Das Haus?')).toBe('/casus/de/speak/?text=Das%20Haus%3F');
  });
});

import { sampleFor } from '../../src/app/lib/pronounce.js';
describe('sample recordings for a sound', () => {
  const index = { a: { f: '1.mp3' }, ts: { f: '2.mp3' }, 'ʊ': { f: '3.mp3' }, 'tʼ': { f: '4.mp3' } };
  it('finds the sound itself, without its tie bar, or its bare letter', () => {
    expect(sampleFor('tʼ', index)).toBe('4.mp3');
    expect(sampleFor('t͡s', index)).toBe('2.mp3');
    expect(sampleFor('aː', index)).toBe('1.mp3');
    expect(sampleFor('ʊ̯', index)).toBe('3.mp3');
  });
  it('is null when there is none', () => {
    expect(sampleFor('ɮ', index)).toBeNull();
  });
});

describe('languages written without spaces', () => {
  const lemmas = { 1: { headword: '日本' }, 2: { headword: '日本語' }, 3: { headword: 'です' } };
  const ipa = { 1: [{ ipa: '[nʲiho̞ɴ]', tags: [] }], 2: [{ ipa: '[nʲiho̞ŋɡo̞]', tags: [] }], 3: [{ ipa: '[de̞sɨ]', tags: [] }] };
  it('cuts the text into the longest headwords it knows', async () => {
    const out = await expectedFor('日本語です。', { index: buildIpaIndex(lemmas, ipa), lemmas, ipa, noSpaces: true });
    expect(out.map((w) => [w.word, w.source])).toEqual([['日本語', 'exact'], ['です', 'exact']]);
  });
  it('keeps unknown characters as words without transcription', async () => {
    const out = await expectedFor('猫です', { index: buildIpaIndex(lemmas, ipa), lemmas, ipa, noSpaces: true });
    expect(out.map((w) => [w.word, w.source])).toEqual([['猫', 'none'], ['です', 'exact']]);
  });
});

import { speakable } from '../../src/app/lib/pronounce.js';
describe('which bold bits of a lesson get a trainer link', () => {
  it('sentences and phrases do', () => {
    expect(speakable('Das Haus ist groß.')).toBe(true);
    expect(speakable('Μένω στην Αθήνα.')).toBe(true);
    expect(speakable('Vieni qui!')).toBe(true);
    expect(speakable('日本語を話します。')).toBe(true);
  });
  it('single words, endings and labels do not', () => {
    expect(speakable('Haus')).toBe(false);
    expect(speakable('-εις')).toBe(false);
    expect(speakable('σε + το = στο')).toBe(false);
    expect(speakable('1')).toBe(false);
  });
});

import { cost, ipaFromWikitext } from '../../src/app/lib/pronounce.js';
describe('fine points of the comparison', () => {
  it('a non-syllabic mark or a tie bar alone does not make a sound different', () => {
    expect(cost('ʊ̯', 'ʊ')).toBe(0);
    expect(cost('t͡s', 'ts')).toBe(0);
  });
});

describe('the IPA of a word form, read from its Wiktionary page', () => {
  const page = `==English==\n===Pronunciation===\n* {{IPA|en|/ɪst/}}\n\n==German==\n===Pronunciation===\n* {{IPA|de|/ɪst/|[ʔɪst]}}\n===Verb===\n{{head|de|verb form}}\n# {{inflection of|de|sein||3|s|pres}}\n`;
  it("takes the first transcription of the language's section", () => {
    expect(ipaFromWikitext(page, 'German', 'de')).toBe('/ɪst/');
  });
  it('is null when the language has no section or no IPA', () => {
    expect(ipaFromWikitext(page, 'Dutch', 'nl')).toBeNull();
    expect(ipaFromWikitext('==German==\n# word', 'German', 'de')).toBeNull();
  });
});

describe('words written without their diacritics', () => {
  it('match a vowelled headword (Arabic) or one with macrons (Latin)', async () => {
    const lemmas = { 1: { headword: 'ذَهَبَ' }, 2: { headword: 'dīvīsa' } };
    const ipa = { 1: [{ ipa: '/ða.ha.ba/', tags: [] }], 2: [{ ipa: '[diːˈwiːsa]', tags: [] }] };
    const out = await expectedFor('ذهب divisa', { index: buildIpaIndex(lemmas, ipa), lemmas, ipa });
    expect(out.map((w) => w.source)).toEqual(['exact', 'exact']);
  });
});

describe('tones', () => {
  it('superscript tone numbers are not sounds of their own (Chinese)', () => {
    expect(segments('/wɔ²¹⁴/')).toEqual(['w', 'ɔ']);
  });
});

import { entriesFor } from '../../src/app/lib/pronounce.js';
describe('the dictionary entry of a word in the trainer', () => {
  it('groups the readings by lemma, in the order found, and drops lemmas missing from the table', () => {
    const lemmas = { 7: { headword: 'sein', dict_form: 'sein', pos: 'verb' }, 9: { headword: 'ist', pos: 'noun' } };
    const analyses = [{ lemma: 7, pos: 'verb', person: '3', number: 'sg' }, { lemma: 7, pos: 'verb', person: '3', number: 'sg', mood: 'subj' }, { lemma: 12 }, { lemma: 9, pos: 'noun' }];
    const out = entriesFor(analyses, lemmas);
    expect(out.map((e) => [e.id, e.lemma.headword, e.readings.length])).toEqual([['7', 'sein', 2], ['9', 'ist', 1]]);
  });
});

import { widenSlices } from '../../src/app/lib/pronounce.js';
describe('your sounds as audible clips (Allan, 2026-10-20: "barely plays anything")', () => {
  it('each pair knows which heard sound it is, so the comparison row can play it', () => {
    const pairs = align(['k', 'ɔ', 'ʁ', 'p'], ['k', 'ɔ', 'p']);
    expect(pairs.map((p) => p.gi ?? null)).toEqual([0, 1, null, 2]);
  });
  it('a CTC spike one frame wide becomes a clip from midpoint to midpoint, at least 0.15 s', () => {
    const heard = [{ sym: 'k', start: 0.30, end: 0.32 }, { sym: 'ɔ', start: 0.50, end: 0.52 }, { sym: 'p', start: 0.90, end: 0.92 }];
    const w = widenSlices(heard, 1.5);
    expect(w[0].start).toBeCloseTo(0.20, 2); expect(w[0].end).toBeCloseTo(0.41, 2);
    expect(w[1].start).toBeCloseTo(0.41, 2); expect(w[1].end).toBeCloseTo(0.71, 2);
    expect(w[2].start).toBeCloseTo(0.71, 2); expect(w[2].end).toBeCloseTo(1.02, 2);
    expect(w.every((s) => s.end - s.start >= 0.15)).toBe(true);
    expect(w[0].sym).toBe('k');
  });
});

describe('connected-speech reductions count as near (Allan, 2026-10-20: Wiktionary gives careful standard speech)', () => {
  it('a full vowel said as a schwa, a voicing change and a flap are near, not wrong', () => {
    expect(cost('eː', 'ɐ')).toBe(0.5);
    expect(cost('a', 'ə')).toBe(0.5);
    expect(cost('b', 'p')).toBe(0.5);
    expect(cost('z', 's')).toBe(0.5);
    expect(cost('t', 'ɾ')).toBe(0.5);
    expect(cost('k', 'a')).toBe(1);
  });
  it('a dropped schwa or glottal stop, or one slipped in, is near', () => {
    expect(align(['h', 'a', 'b', 'ə', 'n'], ['h', 'a', 'b', 'n']).map((p) => p.op)).toEqual(['ok', 'ok', 'ok', 'near', 'ok']);
    expect(align(['a', 'n'], ['ʔ', 'a', 'n']).map((p) => p.op)).toEqual(['near', 'ok', 'ok']);
    expect(align(['h', 'a', 'n'], ['h', 'n']).map((p) => p.op)).toEqual(['ok', 'del', 'ok']);
  });
});

describe('score with a slipped-in weak sound', () => {
  it('a glottal stop said before a vowel does not change the score', () => {
    expect(score(align(['a', 'n'], ['ʔ', 'a', 'n']))).toBe(100);
  });
});

describe('generated form IPA is compared, and regional variants are offered (Allan, 2026-10-22)', () => {
  it("a form's generated IPA counts in the comparison (it used to be a wildcard)", () => {
    expect(expectedSounds([{ word: 'machst', ipa: 'maxst', source: 'form' }])).toEqual(['m', 'a', 'x', 's', 't']);
    expect(expectedSounds([{ word: 'Häuser', ipa: '/haʊ̯s/', source: 'lemma' }])).toEqual(['*']);   // a lemma's IPA stays a wildcard
  });
  it('every Wiktionary variant is kept with its tags', async () => {
    const lemmas = { 1: { headword: 'König' } };
    const ipa = { 1: [{ ipa: '/ˈkøːnɪç/', tags: ['standard'] }, { ipa: '/ˈkøːnɪk/', tags: ['Southern-Germany', 'Austria'] }] };
    const index = buildIpaIndex(lemmas, ipa);
    const [w] = await expectedFor('König', { index, lookup: async () => [], lemmas, ipa });
    expect(w.variants.map((v) => v.tags[0])).toEqual(['standard', 'Southern-Germany']);
  });
  it('the comparison uses the variant closest to what was heard', () => {
    const expected = [{ word: 'König', ipa: '/ˈkøːnɪç/', source: 'exact', variants: [{ ipa: '/ˈkøːnɪç/', tags: ['standard'] }, { ipa: '/ˈkøːnɪk/', tags: ['Austria'] }] }];
    const heard = ['k', 'øː', 'n', 'ɪ', 'k'];
    const [w] = bestVariants(expected, heard);
    expect(w.ipa).toBe('/ˈkøːnɪk/');
    expect(w.chosen).toEqual(['Austria']);
    expect(score(align(expectedSounds([w]), heard))).toBe(100);
  });
});

// Japanese Conversation lines carry the sounds the build computed from our own kana (tools/ja_phonemes.py); the
// compare uses them, not a cut into headwords (日本 → "hi hon", Allan 2026-10-27; verbs had no IPA at all)
describe('expected IPA from the course', () => {
  it('takes the sentence sounds without accent marks and scores them', async () => {
    const got = await expectedFor('日本です', { index: new Map(), course: 'ni↑hoɴ#de↓sɯ.' });
    expect(got).toEqual([{ word: '日本です', ipa: 'nihoɴdesɯ', source: 'course' }]);
    expect(expectedSounds(got)).toEqual(['n', 'i', 'h', 'o', 'ɴ', 'd', 'e', 's', 'ɯ']);
  });
});
