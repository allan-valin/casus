import { describe, it, expect } from 'vitest';
import { kanaToRomaji, toHiragana } from '../../src/lang/ja/romanize.js';
import { alignFurigana } from '../../src/lang/ja/furigana.js';

describe('romaji (Hepburn, as Wiktionary writes it)', () => {
  it.each([
    ['がっこう', 'gakkō'], ['たべました', 'tabemashita'], ['きょう', 'kyō'], ['しんぶん', 'shinbun'], ['きんようび', "kin'yōbi"],
    ['ちょっと', 'chotto'], ['コーヒー', 'kōhī'], ['ニュース', 'nyūsu'], ['ふじさん', 'fujisan'], ['じゅうじ', 'jūji'],
    ['ありがとう', 'arigatō'], ['とうきょう', 'tōkyō'], ['まっちゃ', 'matcha'], ['ヴァイオリン', 'vaiorin'], ['ティー', 'tī'],
  ])('%s → %s', (k, r) => expect(kanaToRomaji(k)).toBe(r));
  it('a verb keeps its final u (おもう omou), which kana alone cannot show', () => expect(kanaToRomaji('おもう', { verb: true })).toBe('omou'));
  it('katakana to hiragana for furigana', () => expect(toHiragana('コーヒー')).toBe('こーひー'));
});

describe('furigana: the reading laid over the kanji, okurigana left alone', () => {
  it.each([
    ['食べました', 'たべました', [['食', 'た'], ['べました', null]]],
    ['学校', 'がっこう', [['学校', 'がっこう']]],
    ['食べ物', 'たべもの', [['食', 'た'], ['べ', null], ['物', 'もの']]],
    ['お茶', 'おちゃ', [['お', null], ['茶', 'ちゃ']]],
    ['ひらがな', null, [['ひらがな', null]]],
  ])('%s', (s, r, out) => expect(alignFurigana(s, r)).toEqual(out));
  it('a reading that does not fit the kana in the word gives none', () => expect(alignFurigana('食べる', 'のむ')).toEqual([['食べる', null]]));
});
