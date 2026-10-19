# Overnight work list (Allan, 2026-10-19)

Allan: "tokens will end at some point, be sure to continue until I say so after they refreshed instead of just
finishing the current step that was interrupted." Work down this whole list, in order, until he says stop.
Commit + push + deploy + live check at every checkpoint. When he says he woke up: progress report.

Decisions (his answers): phrase answers show the REAL sense; explanations written by me are labelled
"note written for Casus"; new languages stay in this repo (/casus/<code>/), no new repos.

1. [x] Phrases: show the Casus notes (UI), deploy. Latin/Greek notes written (tools/casus_build/notes.py).
2. [x] German proverbs: labelled notes for the ones whose English gloss does not carry the sense.
3. [x] Japanese, fully — own plan in docs/superpowers/plans/: JMdict + KANJIDIC (CC BY-SA), segmentation +
       deinflection, furigana over kanji and hiragana over katakana with a toggle, spaces after particles,
       particles as role chunks, romaji under words, IPA, speaker, Wiktionary links, kana drills (hiragana and
       katakana, grid), frequent words, phrases, verb/adjective tables, cheat sheet.
4. [x] Arabic, fully (RTL, vowel marks supplied from the dictionary, root/pattern, transliteration, drills).
5. [x] Russian, fully (cases — reuse the case engine; stress marks; Cyrillic drill).
6. [x] Korean, fully (Hangul drill, particles, romanization).
7. [x] Chinese, fully (segmentation, pinyin with tones, characters drill).
8. [x] Macedonian, fully (Cyrillic, articles as suffixes).

## Done log
- 2026-10-19 night: phrases notes live — Latin 49 + 60 Wikipedia, Greek 8 + 1, German proverbs 40 + 3; word-by-word boxed; keys 1–4/Enter; Reader/Drills row; Greek transliteration in drills.
- 2026-10-19 ~02:50: Japanese, Arabic, Russian, Korean, Chinese LIVE (/casus/ja|ar|ru|ko|zh/), each with reader, dictionary,
  transliteration, alphabet/kana/hangul/characters drill, tables (not zh), frequent words, phrases. Notes in
  docs/languages/<code>.md. Chinese phrase lists were still building (re-release zh after: node tools/build_wordlists.mjs zh;
  bash tools/release_data.sh zh). Known (魚 うお fixed later that morning: JLPT-ranked readings); Arabic random words approximate; Korean
  frequency has some homograph noise.
- ~04:00: Macedonian, Finnish, Modern Greek live; Chinese phrases (9,952 incl. chengyu) released. Next in Allan's order:
  Sanskrit, Czech, Polish, Turkish, Hungarian, Icelandic, Portuguese (pt-BR). Data total 558 MB of the 1 GB Pages
  limit: new languages are streamed and filtered (tools/fetch_filtered.py); keep each under ~40 MB.
- 2026-10-19 morning: Sanskrit, Czech, Polish, Turkish, Hungarian, Icelandic, Portuguese (Brazil) LIVE
  (/casus/sa|cs|pl|tr|hu|is|pt/). Sanskrit: Devanagari + IAST, danda sentences, final anusvara = m, Devanagari drill,
  no frequency list. Polish verbs get their person from table order; Turkish verbs from the personal ending (Wiktionary
  tags a row off). Portuguese is caseless: subject / direct / indirect object by word order, articles and clitics.
  Data 692 MB of the 1 GB Pages limit. Known: proper names unknown in the streamed languages (filter drops them);
  Sanskrit sandhi: word-end cases undone, fused words not split; Hungarian "to be" model fixed (van).
- Next (my pick, list done): Finnish and Polish lists still building (re-release fi, pl); then the known issues above.
- after the list: names read as nouns on the factory languages (Maria = subject); Sanskrit word-end sandhi; Japanese
  readings ranked (rare last, JLPT form+reading pairs, then kana main entries: 魚 さかな, 私 わたし); 今日は inside a
  sentence = 今日 + は.
- Korean: copula split (학생이에요), 거 = 것, 이건 = 이거, pronouns first; Korean list rebuilt clean. Chinese list now
  has the one-character pronouns (我 你 他); other single characters stay out because the dump lacks some common senses
  (都 dōu "all" is missing; only 都 dū "capital").
