# Serbo-Croatian in Casus

Built 2026-10-21 on the generic case-language builder, next in the order Allan accepted (lt, he, **sh**, ro, sv). One
language as Wiktionary treats it — the standard Bosnian, Croatian, Montenegrin and Serbian varieties together — in
Latin and Cyrillic script.

- Seven cases (nominativ, genitiv, dativ, akuzativ, vokativ, lokativ, instrumental); prepositions with theirs in both
  scripts (u/na/o/po + loc/acc, s/sa + ins, k/ka + dat, iz/od/do/bez/kod + gen…).
- Data: English Wiktionary via kaikki (CC BY-SA), 70,309 entries (42,424 Latin, 27,885 Cyrillic) → 59,745 lemmas,
  449,705 forms. Frequency: the Croatian FrequencyWords list (OpenSubtitles, CC BY-SA).
- **Tone and length marks**: the dictionary writes them on vowels and syllabic r (kȕća, kȕćē, ку̏ћа); keys drop
  those and keep the marks that make letters (ć č š ž) — tools/casus_build/sh.py, src/lang/sh/script.js.
- Nouns get their gender from the canonical form (these dumps don't tag the senses; same fix for Lithuanian and
  Hebrew).
- Voice: espeak-ng `hr`.
- Samples: everyday sentences written for Casus, Latin and Cyrillic (0/53 unknown); Hasanaginica (folk ballad,
  written down 1774) in Wikisource's modern ijekavian spelling (10/48 — archaic forms); Wikipedia's *Srpskohrvatski
  jezik* (9/62 — comparatives and derived adjectives).
- Not yet: comparative and superlative forms (skipped for every generic language), the enclitic order (je, se, mi…),
  Learn lessons.
