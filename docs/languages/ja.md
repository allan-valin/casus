# Japanese in Casus

Built overnight 2026-10-19 (plan: docs/superpowers/plans/2026-10-19-casus-japanese.md).

## What the reader does
- **Word splitting.** Japanese has no spaces. Every substring of a run (up to 12 characters) is looked up, and
  the fewest dictionary words that cover the run win, as rikaikun does on hover. A word known only through the kana
  spelling of a kanji word costs a little more, so は is the particle and not 歯 "tooth". An unknown character costs
  more than a word, and an unknown katakana run is one word (a loanword the dictionary lacks).
- **Particles as roles.** は topic, が subject, を object, に/へ target or direction, で place of action or means,
  の possessor, と "with, and", から/まで/より "from, until, than". The word before the particle takes the role's
  colour (the same hues as the cases elsewhere), the particle shows it as its badge, and the two are one chunk.
- **Verb and adjective forms.** The badge names the form: pol (〜ます), pol past (〜ました), neg, past, te, can
  (potential), pass, caus, want (〜たい)…
- **Furigana.** The reading in small hiragana over each kanji, as NHK News Web Easy prints it; okurigana are left
  alone (食べました: た over 食 only); katakana words get hiragana over them. The "furigana" checkbox turns it off.
- **Romaji** under each word (modified Hepburn as Wiktionary writes it: gakkō, kōhī; the particles は へ を read
  wa, e, o; a verb's final う stays u: omou).
- **Gaps after grammar.** In the sentences panel a small gap follows each particle and each verb or adjective
  form. The text is a little larger (×1.15).

## Data
- English Wiktionary via kaikki.org (CC BY-SA): 85k lemmas, 661k forms in kanji and kana (romaji dropped). Each
  form carries its kana reading (`~reading` in the shard rows), from which the furigana are laid out.
- Wiktionary's verb tables lack the everyday polite and past-negative forms; tools/casus_build/ja/conj.py adds
  the standard conjugation of each class (godan, 行く, ichidan, する and noun+する, 来る, i- and na-adjectives).
- Shards: a hash of the first two characters (tools/casus_build/ja/bucket.py = src/lang/ja/bucket.js).

## Drills
- Kana: hiragana and katakana rows (46 basic + voiced), sound in romaji, the usual alternatives (shi/si, tsu/tu…).
- Adjective forms and verb forms: a table plain · polite · negative · polite negative by present, past, te…;
  "Random word" picks a word of the same class (書く → 聞く, 置く; 食べる → 見る, 教える).
- JLPT words: N5 and N4 vocabulary (open-anki-jlpt-decks, MIT).
- Phrases & sayings: Wiktionary's Japanese phrases, idioms and proverbs, with readings and word by word.

## Not yet
- Pitch accent; kanji-by-kanji (KANJIDIC) entries; a parser for clause structure; the ている/てある aspect pairs as
  one chunk; counters glued to their numbers.
