# Casus Japanese — implementation plan (overnight, 2026-10-19)

Allan's asks (spec 2026-10-18 + chat): Japanese reader with furigana (kanji, and hiragana over katakana) with a
toggle, spaces after grammar markers, slightly bigger font, particles as role chunks, verb forms shown, IPA,
speaker, Wiktionary link, romaji under words, kana drills (grid, sound first, all rows ticked), frequent
words, phrases, conjugation tables, cheat sheet. Reference: rikaikun (longest-match lookup), NHK Easy furigana.

## Data (tools/casus_build/ja/, `build_lang.py ja`)
- Source: kaikki.org Japanese (English Wiktionary, CC BY-SA). Entries noun/verb/adj/adv/pron/particle/
  conj/intj/suffix/prefix/counter/phrase/proverb; skip romanization, soft-redirect, character, syllable, name.
- Lemma: headword (kanji or kana), reading (kana) and furigana segments from the head template's ruby
  ("学(がっ)校(こう)" -> [["学","がっ"],["校","こう"]]), pos, verb class (godan/ichidan/irregular), adj class (i/na),
  gloss, IPA.
- Forms: every inflected form in kanji and kana (romaji dropped), with its form name (past, negative,
  polite, te, volitional, potential, passive, causative, imperative, conditional, continuative…); the kana
  reading of the headword is a form of the lemma too, so kana-only text is found.
- Codes: POS + one `form` channel (verbs, adjectives). Shards by first character (key = the form itself).

## Reader (src/lang/ja/)
- segment: sentences end at 。！？!? and newlines.
- tokenize: runs of Japanese script vs punctuation; katakana runs kept whole; numbers whole.
- splitWords (new optional async hook in state.load): every substring (≤ 12 chars) of a run is looked up;
  a DP picks the fewest words (unknown characters cost more; an unknown katakana run is one word).
- stages: particleStage — a role particle (は topic, が subject, を object, に target, へ direction, で place/means,
  の possessive, と with/and, から from, まで until) colours the word before it by that role and the two are
  glued as one chunk; the particle takes the role's hue as `governs`.
- inventory: primary channel `role` (8 hues, Okabe–Ito order), verb badge = form (past, neg, polite, te…).
- Block: furigana as ruby per kanji segment, hiragana over katakana words, toggle `furigana`; romaji
  (script.romanize = kana→Hepburn of the reading) under; text pane: furigana + gap after particles; bigger font.
- voice: browser ja-JP, espeak-ng `ja` fallback. Wiktionary: Japanese section.

## Drills
- Kana: hiragana and katakana rows (gojūon, dakuten, combinations), shared alphabet game (refactor from Greek).
- Endings: verb and adjective tables (one column per form group: plain/polite × positive/negative).
- Frequent words: FrequencyWords ja (CC BY-SA 4.0) lemmatised; phrases: Wiktionary phrases/proverbs/idioms.

## Order (each: tests first, commit, deploy)
1. build ja data + tests  2. language definition, segmentation, particle stage  3. furigana/romaji display
4. kana drill  5. tables, frequency, phrases  6. samples, docs (docs/languages/ja.md), NOTICE, live check.
