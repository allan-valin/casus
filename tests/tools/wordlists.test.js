import { describe, it, expect } from 'vitest';
import { shortGloss, literalOf, rankLemmas, PLAIN } from '../../tools/build_wordlists.mjs';

describe('word lists for the drills', () => {
  it('shortGloss: the first sense, without brackets, short', () => {
    expect(shortGloss('pig, swine (animal); scoundrel')).toBe('pig, swine');
    expect(shortGloss('to have; to own')).toBe('to have');
    expect(shortGloss('')).toBe('');
    // grammar notes are not meanings (sein: forms the perfect; to be)
    expect(shortGloss('forms the present perfect and past perfect tenses of certain verbs; to be; to exist')).toBe('to be');
    expect(shortGloss('gerund of leben: living; life')).toBe('life');
    expect(shortGloss('inflection of der:')).toBe('inflection of der:');
  });
  it('literalOf prefers the frequent word when a form fits several (ἔδει: δεῖ, not ἔδω)', () => {
    const tokens = [{ kind: 'word', surface: 'ἔδει', key: 'ἔδει' }];
    const lookups = new Map([['ἔδει', [{ lemma: 'eat', pos: 'verb' }, { lemma: 'must', pos: 'verb' }]]]);
    const lemmas = { eat: { headword: 'ἔδω' }, must: { headword: 'δεῖ' } };
    expect(literalOf(tokens, lookups, { eat: 'to eat', must: 'it is necessary' }, lemmas, new Set(['δεῖ']))).toEqual([['ἔδει', 'it is necessary']]);
  });
  it('literalOf: each word of a phrase with its own meaning (Schwein haben: pig, have)', () => {
    const tokens = [{ kind: 'word', surface: 'Schwein', key: 'Schwein' }, { kind: 'word', surface: 'haben', key: 'haben' }];
    const lookups = new Map([['Schwein', [{ lemma: '1', pos: 'noun' }]], ['haben', [{ lemma: '2', pos: 'verb' }]]]);
    const glosses = { 1: 'pig, swine; scoundrel', 2: 'to have; to own' };
    expect(literalOf(tokens, lookups, glosses)).toEqual([['Schwein', 'pig, swine'], ['haben', 'to have']]);
  });
  it('rankLemmas: word forms counted under their dictionary word, the headword reading first', () => {
    const rows = [{ form: 'ich', n: 60 }, { form: 'ist', n: 50 }, { form: 'sein', n: 20 }, { form: 'das', n: 40 }, { form: 'haus', n: 5 }, { form: 'xyz', n: 99 }];
    const lookups = new Map([
      ['ich', [{ lemma: 'i', pos: 'pron' }]], ['Ich', [{ lemma: 'I', pos: 'noun' }]], ['ist', [{ lemma: 's', pos: 'verb' }]], ['sein', [{ lemma: 'p', pos: 'det' }, { lemma: 's', pos: 'verb' }]],
      ['das', [{ lemma: 'd', pos: 'det' }]], ['Haus', [{ lemma: 'h', pos: 'noun' }]],
    ]);
    const lemmas = { i: { headword: 'ich', dict_form: 'ich', pos: 'pron' }, I: { headword: 'Ich', dict_form: 'das Ich', pos: 'noun' }, s: { headword: 'sein', dict_form: 'sein', pos: 'verb' }, p: { headword: 'sein', dict_form: 'sein', pos: 'det' }, d: { headword: 'der', dict_form: 'der', pos: 'det' }, h: { headword: 'Haus', dict_form: 'das Haus', pos: 'noun' } };
    const glosses = { i: 'I', I: 'ego', s: 'to be', p: 'his', d: 'the', h: 'house' };
    const out = rankLemmas(rows, lookups, lemmas, glosses, 10);
    // ich: the pronoun (same case), not das Ich; the form sein goes to the verb, which ist shows is common
    expect(out.map((o) => [o.w, o.pos])).toEqual([['sein', 'verb'], ['ich', 'pron'], ['der', 'det'], ['das Haus', 'noun']]);
    expect(out[0]).toMatchObject({ rank: 1, en: 'to be' });
  });
});

describe('German function words keep their everyday meaning', () => {
  it('a form that is several words takes the function-word one (aber: but, not again); form-of glosses never win', () => {
    const lookups = new Map([['aber', [{ lemma: 'adv', pos: 'adv' }, { lemma: 'conj', pos: 'conj' }]], ['mir', [{ lemma: 'wir2', pos: 'pron' }, { lemma: 'ich', pos: 'pron' }]]]);
    const lemmas = { adv: { headword: 'aber', pos: 'adv' }, conj: { headword: 'aber', pos: 'conj' }, wir2: { headword: 'mir', pos: 'pron' }, ich: { headword: 'ich', pos: 'pron' } };
    const glosses = { adv: 'again', conj: 'but', wir2: 'alternative form of wir', ich: 'I' };
    const out = rankLemmas([{ form: 'aber', n: 9 }, { form: 'mir', n: 5 }], lookups, lemmas, glosses, 5);
    expect(out.map((o) => [o.w, o.en])).toEqual([['aber', 'but'], ['ich', 'I']]);
  });
  it('articles and auxiliaries get a plain meaning', () => {
    expect(shortGloss('nominative masculine singular definite article, the; ...', 'der', 'det', PLAIN.de)).toBe('the');
    expect(shortGloss('day', 'die', 'noun', PLAIN.la ?? {})).toBe('day');           // Latin die is not German die
    expect(shortGloss('As a copulative verb:', 'sein', 'verb', PLAIN.de)).toBe('to be');
  });
});

describe('German frequency: more of the real list', () => {
  const L = (headword, pos, dict_form = headword) => ({ headword, pos, dict_form });
  it('a capitalised noun only when the lowercase form is no word (habe: haben, not die Habe); a function word beats a rare verb (einen: ein)', () => {
    const lookups = new Map([
      ['habe', [{ lemma: 'haben', pos: 'verb' }]], ['Habe', [{ lemma: 'Habe', pos: 'noun' }]],
      ['einen', [{ lemma: 'einenV', pos: 'verb' }, { lemma: 'ein', pos: 'det' }]],
    ]);
    const lemmas = { haben: L('haben', 'verb'), Habe: L('Habe', 'noun', 'die Habe'), einenV: L('einen', 'verb'), ein: L('ein', 'det') };
    const glosses = { haben: 'to have', Habe: 'belongings', einenV: 'to unite', ein: 'a, an' };
    expect(rankLemmas([{ form: 'habe', n: 9 }, { form: 'einen', n: 5 }], lookups, lemmas, glosses, 5).map((o) => o.w)).toEqual(['haben', 'ein']);
  });
  it('one row per dictionary word: two lemmas printed the same merge', () => {
    const lookups = new Map([['der', [{ lemma: 'd1', pos: 'det' }]], ['dem', [{ lemma: 'd2', pos: 'pron' }]]]);
    const lemmas = { d1: L('der', 'det'), d2: L('der', 'pron') };
    expect(rankLemmas([{ form: 'der', n: 9 }, { form: 'dem', n: 5 }], lookups, lemmas, { d1: 'the', d2: 'that' }, 5).map((o) => o.w)).toEqual(['der']);
  });
  it('nested brackets go whole; descriptions are not meanings', () => {
    expect(shortGloss('I (first-person singular nominative (subject) pronoun)')).toBe('I');
    expect(shortGloss('describes an abstract directionality; for')).toBe('for');
  });
});

describe('German frequency: an ambiguous form goes to the word that is common elsewhere', () => {
  it('hast: haben (common), not hasten; single letters are no words', () => {
    const L = (headword, pos) => ({ headword, pos, dict_form: headword });
    const lookups = new Map([['habe', [{ lemma: 'haben', pos: 'verb' }]], ['hast', [{ lemma: 'hasten', pos: 'verb' }, { lemma: 'haben', pos: 'verb' }]], ['n', [{ lemma: 'n', pos: 'det' }]]]);
    const lemmas = { haben: L('haben', 'verb'), hasten: L('hasten', 'verb'), n: L('n', 'det') };
    const out = rankLemmas([{ form: 'habe', n: 9 }, { form: 'hast', n: 5 }, { form: 'n', n: 50 }], lookups, lemmas, { haben: 'to have', hasten: 'to hurry', n: 'a' }, 5);
    expect(out.map((o) => [o.w, o.rank])).toEqual([['haben', 1]]);
  });
});

describe('an uninflected word spelled like the form wins (mal: the particle, not malen)', () => {
  it('mal', () => {
    const L = (headword, pos) => ({ headword, pos, dict_form: headword });
    const lookups = new Map([['malen', [{ lemma: 'malen', pos: 'verb' }]], ['mal', [{ lemma: 'malen', pos: 'verb' }, { lemma: 'mal', pos: 'adv' }]]]);
    const out = rankLemmas([{ form: 'mal', n: 9 }, { form: 'malen', n: 1 }], lookups, { malen: L('malen', 'verb'), mal: L('mal', 'adv') }, { malen: 'to paint', mal: 'times; just' }, 5);
    expect(out.map((o) => o.w)).toEqual(['mal', 'malen']);
  });
});

describe('Arabic frequency: a vowelled headword counts as the bare form (في: in, not فم mouth)', () => {
  it('compares bare letters when told how', async () => {
    const { stripAr } = await import('../../src/lang/ar/normalize.js');
    const lookups = new Map([['في', [{ lemma: 'fam', pos: 'noun' }, { lemma: 'fi', pos: 'prep' }]], ['فم', [{ lemma: 'fam', pos: 'noun' }]]]);
    const lemmas = { fam: { headword: 'فَم', pos: 'noun', dict_form: 'فَم' }, fi: { headword: 'فِي', pos: 'prep', dict_form: 'فِي' } };
    const out = rankLemmas([{ form: 'في', n: 9 }, { form: 'فم', n: 1 }], lookups, lemmas, { fam: 'mouth', fi: 'in' }, 5, {}, stripAr);
    expect(out.map((o) => o.en)).toEqual(['in', 'mouth']);
  });
});

describe('word by word: a word spelled that way wins over a kana spelling of a kanji word (は: the particle, not 歯)', () => {
  it('literalOf', () => {
    const tokens = [{ kind: 'word', surface: 'は', key: 'は' }];
    const lookups = new Map([['は', [{ lemma: 'tooth', pos: 'noun', form: 'kana' }, { lemma: 'wa', pos: 'particle' }]]]);
    expect(literalOf(tokens, lookups, { tooth: 'tooth', wa: 'marks the topic' })).toEqual([['は', 'marks the topic']]);
  });
});
describe('a one-character word that can be a particle is the particle', () => {
  it('に', () => {
    const lookups = new Map([['に', [{ lemma: 'niru', pos: 'verb', form: 'stem' }, { lemma: 'ni', pos: 'particle' }]]]);
    expect(literalOf([{ kind: 'word', surface: 'に', key: 'に' }], lookups, { niru: 'to resemble', ni: 'marks the recipient' })).toEqual([['に', 'marks the recipient']]);
  });
});

describe('Korean subtitle forms', () => {
  it('contractions and the copula count under the word they contain (우린: 우리, 거야: 거, 학생이에요: 학생)', async () => {
    const { koreanForms } = await import('../../tools/build_wordlists.mjs');
    const { splitWords, tokenize } = await import('../../src/lang/ko/tokenize.js');
    const WORDS = { 우리: [{ pos: 'pron' }], 거: [{ pos: 'noun' }], 학생: [{ pos: 'noun' }], 하다: [{ pos: 'verb' }] };
    const lexicon = { lookupAll: async (keys) => new Map(keys.map((k) => [k, WORDS[k] ?? []])) };
    WORDS.거야 = [{ pos: 'noun' }];                 // 去夜 "last night": the dictionary has it, the subtitles mean 거 + 야
    expect(await koreanForms([{ form: '우린', n: 9 }, { form: '거야', n: 7 }, { form: '학생이에요', n: 2 }, { form: '하다', n: 5 }], (t) => splitWords(tokenize(t), lexicon), lexicon.lookupAll))
      .toEqual([{ form: '우리', n: 9 }, { form: '거', n: 7 }, { form: '학생', n: 2 }, { form: '하다', n: 5 }]);
  });
});

describe('a common Korean pronoun counts as the pronoun (나: I, not 나다)', () => {
  it('나', async () => {
    const { rankLemmas } = await import('../../tools/build_wordlists.mjs');
    const L = (headword, pos) => ({ headword, pos, dict_form: headword });
    const lookups = new Map([['나', [{ lemma: 'nada', pos: 'verb' }, { lemma: 'na', pos: 'pron' }]], ['나서', [{ lemma: 'nada', pos: 'verb' }]]]);
    const lemmas = { nada: L('나다', 'verb'), na: L('나', 'pron') };
    const out = rankLemmas([{ form: '나', n: 50 }, { form: '나서', n: 5 }], lookups, lemmas, { nada: 'to be born', na: 'I' }, 5, {}, (x) => x, new Map([['나', 'pron']]));
    expect(out[0].w).toBe('나');
  });
});

describe('a language can name the part of speech of its function words (Portuguese um: the article)', () => {
  it('um', async () => {
    const { rankLemmas } = await import('../../tools/build_wordlists.mjs');
    const L = (headword, pos) => ({ headword, pos, dict_form: headword });
    const lookups = new Map([['um', [{ lemma: 'umN', pos: 'noun' }, { lemma: 'umD', pos: 'det' }]], ['uns', [{ lemma: 'umN', pos: 'noun' }]]]);
    const lemmas = { umN: L('um', 'noun'), umD: L('um', 'det') };
    const out = rankLemmas([{ form: 'um', n: 50 }, { form: 'uns', n: 9 }], lookups, lemmas, { umN: 'the digit one', umD: 'a, an' }, 5, {}, (x) => x, new Map([['um', 'det']]));
    expect(out[0]).toMatchObject({ w: 'um', en: 'a, an' });
  });
});

describe('a word with a plain meaning is one row, whatever its parts of speech (Finnish se: it; that)', () => {
  it('se', async () => {
    const { rankLemmas } = await import('../../tools/build_wordlists.mjs');
    const L = (headword, pos) => ({ headword, pos, dict_form: headword });
    const lookups = new Map([['se', [{ lemma: 'p', pos: 'pron' }]], ['sen', [{ lemma: 'p', pos: 'pron' }]], ['seh', [{ lemma: 'i', pos: 'interj' }]]]);
    const lemmas = { p: L('se', 'pron'), i: L('se', 'interj') };
    const glosses = { p: 'that', i: 'here you go' };
    const rows = [{ form: 'se', n: 50 }, { form: 'sen', n: 9 }, { form: 'seh', n: 5 }];
    lookups.set('seh', [{ lemma: 'i', pos: 'interj' }]);
    const out = rankLemmas(rows, lookups, lemmas, glosses, 5, { se: 'it; that' });
    expect(out.map((o) => [o.w, o.en])).toEqual([['se', 'it; that']]);
  });
});

describe('a Chinese character is a word too (Allan, 2026-10-19)', () => {
  it('都 counts under its first reading (dōu "all"), not dropped', async () => {
    const { rankLemmas } = await import('../../tools/build_wordlists.mjs');
    const L = (headword, pos, dict_form) => ({ headword, pos, dict_form });
    const lookups = new Map([['都', [{ lemma: 'dou', pos: 'adv' }, { lemma: 'du', pos: 'noun' }]]]);
    const lemmas = { dou: L('都', 'adv', '都 dōu'), du: L('都', 'noun', '都 dū') };
    const out = rankLemmas([{ form: '都', n: 50 }], lookups, lemmas, { dou: 'all; both', du: 'capital city' }, 5);
    expect(out.map((o) => o.w)).toEqual(['都 dōu']);
  });
});
