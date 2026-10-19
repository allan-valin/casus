# Notices and attributions

Casus' own source code is open source (see `LICENSE`, to be added). All data sources are
public domain or share-alike; there are no commercial or proprietary dependencies.

## Whitaker's WORDS — public domain

`DICTLINE.GEN`, `INFLECTS.LAT` and `UNIQUES.LAT`, fetched by `tools/fetch_data.sh` from
`https://github.com/mk270/whitakers-words` (files live at the repository root) on
2026-08-20 (`UNIQUES.LAT` on 2026-10-02).

William Whitaker placed WORDS in the public domain. The files themselves are downloaded into
`vendor/` and are **not** redistributed by this repository. The derived index under `data/`
is built from them by `tools/build_index.py`; it is not committed at the moment (see
`docs/DATA.md`, the size gate), and when it is, it carries this same public-domain notice.
The one entry added by hand — *sum, esse* — is Whitaker's own (`tools/casus_build/extras.py`).

## Portuguese glosses — CC BY-SA

`data/glosses.pt.json` is derived from the **Portuguese Wiktionary** (pt.wiktionary.org), through
the Wiktextract extraction published at kaikki.org (`ptwiktionary/Latim/`, extraction of
2026-10-16 from the dump of 2026-10-01; fetched 2026-10-18 by `tools/fetch_glosses_pt.sh`,
built by `tools/build_glosses_pt.py`). Wiktionary text is licensed under the
**Creative Commons Attribution-ShareAlike** licence (CC BY-SA 4.0) and the GFDL; the
contributors are the editors of the Portuguese Wiktionary. That file therefore carries
attribution and share-alike obligations and is **separately licensed** from the public-domain
Whitaker-derived assets. It is never blended into them: the page loads it as its own layer and
labels every Portuguese gloss with its language badge.

Coverage, measured 2026-10-18: 1,718 of the 38,179 lemma records (4.5%); 12.1% of the records
Whitaker tags as frequent (A–C). It is a convenience layer for common vocabulary, not a
headline feature (spec §12 question 3); the page falls back to English and says so.

## Pronunciations (IPA) — CC BY-SA

`data/<code>/ipa.json` is derived from the **English Wiktionary**, through the Wiktextract extraction
published at kaikki.org (`tools/fetch_wiktextract.sh`, built by `tools/build_ipa.py`). Wiktionary text is
licensed CC BY-SA 4.0 and the GFDL; the contributors are the editors of the English Wiktionary. The file
is separately licensed from the Whitaker-derived assets and is never blended into them. Latin: fetched
2026-10-18, 18,809 lemma records.

## Ancient Greek dictionary — CC BY-SA

`data/grc/` (forms, lemmas, English glosses, IPA) is derived from the **English Wiktionary**'s Ancient Greek
entries through the Wiktextract extraction at kaikki.org (extraction of 2026-10-03), licensed CC BY-SA 4.0
and the GFDL; the contributors are the editors of the English Wiktionary. Built by `tools/build_lang.py grc`.
The preposition table (`government.json`) follows Smyth's *Greek Grammar* (public domain).

## German dictionary — CC BY-SA

`data/de/` is derived from the **English Wiktionary**'s German entries through the Wiktextract extraction at
kaikki.org, licensed CC BY-SA 4.0 and the GFDL; the contributors are the editors of the English Wiktionary.
Built by `tools/build_lang.py de`. The preposition table follows the Duden *Grammatik*.

## Drills: phrases, sayings and frequent words — CC BY-SA

- **Phrases, idioms and proverbs** (`data/<code>/phrases.json`): multi-word entries of the English Wiktionary
  (via wiktextract / kaikki.org), CC BY-SA 4.0, with their meanings; the word-by-word readings come from the
  dictionaries above.
- **Notes on sayings**: where English Wikipedia has an article about a phrase (memento mori, carpe diem), the
  first two sentences of its summary, with a link to the article; Wikipedia text is CC BY-SA 4.0. Fetched by
  `tools/build_wordlists.py` through the Wikimedia REST API, kept only when the article is about the phrase.
- **Latin and Greek core vocabularies** (`data/la/frequency.json`, `data/grc/frequency.json`): Dickinson
  College Commentaries, *Latin Core Vocabulary* and *Greek Core Vocabulary* (https://dcc.dickinson.edu),
  published as CC BY-SA like the rest of DCC. The page states no separate licence for the lists; they are
  used here with attribution under that licence.
- **German frequency** (`data/de/frequency.json`): Hermit Dave, *FrequencyWords* (OpenSubtitles 2018, de_50k),
  https://github.com/hermitdave/FrequencyWords, content CC BY-SA 4.0; word forms counted under their
  dictionary word by `tools/build_wordlists.mjs`.
- **Model words and their glosses** for the endings drills: chosen and written for Casus
  (`tools/build_drills.py`).

## Japanese — CC BY-SA and MIT

- Dictionary, readings, IPA, phrases: the English Wiktionary via wiktextract / kaikki.org, CC BY-SA 4.0.
- JLPT word lists (`data/ja/frequency.json`): *open-anki-jlpt-decks* by Jam Sinclair and contributors
  (https://github.com/jamsinclair/open-anki-jlpt-decks), MIT licence; the lists go back to Jonathan Waller's JLPT
  resources (tanos.co.uk), published under Creative Commons BY.
- Sample passages: Natsume Sōseki and Akutagawa Ryūnosuke, public domain (texts as in Aozora Bunko).

## Arabic — CC BY-SA

- Dictionary, vowelled forms, IPA, phrases: the English Wiktionary via wiktextract / kaikki.org, CC BY-SA 4.0.
- Frequency (verb selection and frequent words): Hermit Dave, *FrequencyWords* (OpenSubtitles 2018, ar_50k),
  CC BY-SA 4.0.
- Sample passages: sentences written for Casus; Qur'an 1:1–2 (public domain).

## Russian — CC BY-SA

- Dictionary, stressed forms, IPA, phrases: the English Wiktionary via wiktextract / kaikki.org, CC BY-SA 4.0.
- Frequency (word selection and frequent words): Hermit Dave, *FrequencyWords* (OpenSubtitles 2018, ru_50k), CC BY-SA 4.0.
- Sample passages: sentences written for Casus; Tolstoy and Pushkin, public domain.

## Korean — CC BY-SA

- Dictionary, conjugations, IPA, phrases: the English Wiktionary via wiktextract / kaikki.org, CC BY-SA 4.0. The
  particle list and its role names are written for Casus.
- Frequency: Hermit Dave, *FrequencyWords* (OpenSubtitles 2018, ko_50k), CC BY-SA 4.0.
- Sample passages: sentences written for Casus; the first line of *Aegukga* (public domain).

## Chinese — CC BY-SA

- Dictionary, pinyin, IPA, phrases and chengyu: the English Wiktionary via wiktextract / kaikki.org, CC BY-SA 4.0.
- Word frequencies (word splitting, frequent words): Hermit Dave, *FrequencyWords* (OpenSubtitles 2018, zh_cn),
  CC BY-SA 4.0.
- Sample passages: sentences written for Casus; *Analects* 1.1 (public domain).
- CC-CEDICT (MDBG and contributors, https://www.mdbg.net/chinese/dictionary?page=cc-cedict), CC BY-SA 4.0: words and
  readings the Wiktionary extract lacks (都 dōu "all"), and frequent proper names.
- Unihan database (Unicode, Inc.), Unicode License v3: kMandarin orders a character's readings.

## Macedonian — CC BY-SA

- Dictionary, forms, IPA, phrases: the English Wiktionary via wiktextract / kaikki.org, CC BY-SA 4.0.
- Frequency: Hermit Dave, *FrequencyWords* (OpenSubtitles 2018, mk_50k), CC BY-SA 4.0.

## Finnish, Modern Greek, Sanskrit, Czech, Polish, Turkish, Hungarian, Icelandic, Portuguese — CC BY-SA

- Dictionary, forms, IPA, phrases: the English Wiktionary via wiktextract / kaikki.org, CC BY-SA 4.0, streamed and kept
  for the commonest words (tools/fetch_filtered.py).
- Frequency: Hermit Dave, *FrequencyWords* (OpenSubtitles 2018), CC BY-SA 4.0.
- Sample passages: sentences written for Casus; the *Kalevala* (Elias Lönnrot, 1849), public domain; Sanskrit
  *satyam eva jayate* (Muṇḍaka Upaniṣad 3.1.6), public domain.
- Japanese readings are also ranked with the JLPT lists above (MIT).

## Speech — espeak-ng (GPL-3.0)

When the browser has no voice for a language, the speaker button loads espeak-ng compiled to
WebAssembly (`@echogarden/espeak-ng-emscripten`, GPL-3.0) from jsDelivr at the moment it is first used.
It is not bundled with Casus.

## Natural voices — Piper (MIT)

When the reader presses *Download* under "Natural voice", the page loads `@mintplex-labs/piper-tts-web`
(MIT; a browser port of Rhasspy's Piper, MIT) from jsDelivr and the voice model from Hugging Face
(`rhasspy/piper-voices`). German: **Thorsten** (`de_DE-thorsten-medium`, 63 MB), trained on the Thorsten
dataset by Thorsten Müller, released CC0. Neither is bundled with Casus; the browser stores the model.

## Sample passages

Ancient works are long out of copyright. Modern critical editions can carry rights in their
apparatus and editorial choices, so each bundled passage records its source and edition in
`data/samples/SOURCES.md`, and passages are kept short.

## Development dependencies

- vitest — MIT
