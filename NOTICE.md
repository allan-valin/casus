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
- Icelandic inflection: BÍN, the Database of Modern Icelandic Inflection (Beygingarlýsing íslensks nútímamáls), © The
  Árni Magnússon Institute for Icelandic Studies, CC BY-SA 4.0 (https://bin.arnastofnun.is; repository.clarin.is
  handle 20.500.12537/5). Every verb, noun and adjective form; frequent lemmas without an English Wiktionary entry are
  added from it without a meaning.

## Lithuanian — CC BY-SA

- Dictionary, forms, IPA, phrases: the English Wiktionary via wiktextract / kaikki.org, CC BY-SA 4.0; verb and noun
  forms the dump lacks are generated by Casus from the principal parts (docs/languages/lt.md).
- Sample passages: sentences written for Casus; Maironis, *Lietuva brangi* (1920), public domain; Wikipedia,
  *Lietuvių kalba*, CC BY-SA 4.0.

## Hebrew — CC BY-SA

- Dictionary, forms, IPA, phrases: the English Wiktionary via wiktextract / kaikki.org, CC BY-SA 4.0; full spellings
  of the pointed forms generated by Casus (docs/languages/he.md).
- Sample passages: sentences written for Casus; Hayim Nahman Bialik, *El ha-tsipor* (1891), public domain (text from
  he.wikisource); Genesis 1:1–5, public domain.

## Serbo-Croatian — CC BY-SA

- Dictionary, forms, IPA, phrases: the English Wiktionary via wiktextract / kaikki.org, CC BY-SA 4.0. Frequency:
  Hermit Dave, *FrequencyWords* (OpenSubtitles 2018, Croatian list), CC BY-SA 4.0.
- Sample passages: sentences written for Casus; *Hasanaginica* (folk ballad, public domain) in the modern ijekavian
  adaptation of hr.wikisource (CC BY-SA); Wikipedia, *Srpskohrvatski jezik*, CC BY-SA 4.0.

## Learn tab

- Japanese grammar lessons: **JLPT Grammar Enhanced** (github.com/maitodesu/jlpt-grammar-enhanced, commit a4254e0),
  CC BY-SA 4.0 — 847 grammar points N5–N1 with their explanations, formation tables, examples, nuance, contrasts,
  common mistakes and practice questions, by its authors; shown as written, with furigana rendered as ruby. Topic
  groups and order are the book's.
- Japanese words and kanji by level: OpenJLPT (github.com/evanclan/OpenJLPT), CC BY-SA 4.0; levels after Jonathan
  Waller's JLPT resources (tanos.co.uk, CC BY); kanji data from KANJIDIC (EDRDG, CC BY-SA).
- Exercise sentences: **Tatoeba** (tatoeba.org), CC BY 2.0 FR — Japanese sentences with their English and Portuguese
  translations, matched to lessons by tools/learn_examples.mjs. Romaji and word lists come from Casus's own reading
  of each sentence. Fetch the sources with tools/fetch_learn_sources.sh.
- Macedonian lessons (A1–C2, 76 lessons): **written for Casus** (tools/curricula/mk/), explanations and examples in
  English and Portuguese, labelled as such on every lesson. No open graded Macedonian course exists; the topic order
  follows the usual course order, the facts Wikipedia's "Macedonian grammar" (CC BY-SA) and the standard grammars.
  Exercises and "more examples": Tatoeba's Macedonian sentences with their English and Portuguese translations
  (CC BY 2.0 FR), matched to lessons on Casus's own reading of each sentence (tools/learn_curriculum.mjs); wrong
  answers come from the Wiktionary-based paradigm tables (CC BY-SA). Sentences with sexual or vulgar content are left
  out.
- Arabic lessons (A1–C1, 45 lessons): **written for Casus** (tools/curricula/ar/), in English and Portuguese. The open
  Arabic textbooks found (Michigan State's Elementary/Intermediate Arabic) are CC BY-NC and were not used; facts follow
  Wikipedia's Arabic grammar articles (CC BY-SA) and the public-domain grammars of Wright (1896) and Thatcher (1910).
  Exercises from Tatoeba's Arabic sentences (CC BY 2.0 FR); a form question shows its answer vowelled only when the
  paradigm table (Wiktionary, CC BY-SA) confirms the one form the sentence needs.
- Latin lessons: **Benjamin L. D'Ooge, *Latin for Beginners*** (Ginn, 1909), public domain, from Project Gutenberg #18251
  (vendor/dooge/): its 79 lessons with their explanations, tables, vocabularies and exercises, as the book has them
  (pictures left out). Stages, topics, Portuguese summaries and the Tatoeba rules are Casus's (tools/curricula/la/).
  Exercises from Tatoeba's Latin sentences (CC BY 2.0 FR) and from the book's own Latin sentences; wrong answers from
  the Whitaker's Words paradigms (public domain), only forms attested in the Tatoeba sentences when there are enough.
- Ancient Greek lessons (31, Beginner–Reading): **written for Casus** (tools/curricula/grc/), English and Portuguese.
  White's First Greek Book (1896) is public domain but only as scans, its UMKC digital edition is CC BY-NC-SA, and
  Wikibooks' course is a stub; the facts follow Smyth's Greek Grammar (1920, public domain). Paradigm tables are
  generated from the Wiktionary-based paradigms (CC BY-SA; tools/learn_tables.py). Exercise sentences: Tatoeba's Greek
  (CC BY 2.0 FR) and Xenophon's Anabasis and Memorabilia and Lysias 1 from the **Perseus Digital Library**
  (canonical-greekLit, CC BY-SA 4.0; tools/build_corpus.py).
- German lessons (92, A1–B2): **Grimm Grammar**, COERLL, The University of Texas at Austin (coerll.utexas.edu/gg),
  CC BY 4.0 — each page's explanation and examples, and the exercise sets of its answer key, as the site has them
  (audio and pictures left out; vendor/grimm/, tools/learn_de.py). The CEFR levels, topic order, Portuguese summaries
  and Tatoeba rules are Casus's (tools/curricula/de/plan.yml). Exercises also from Tatoeba's German sentences
  (CC BY 2.0 FR). COERLL's textbook *Deutsch im Blick* (CC BY 4.0) was checked and is the same project's.
- Russian lessons (35, A1–B2): **written for Casus** (tools/curricula/ru/), English and Portuguese. Mezhdu nami, the
  main open Russian textbook, is CC BY-NC-ND and was not used; tables with stress marks are generated from the
  Wiktionary-based paradigms (CC BY-SA). Exercises from Tatoeba's Russian sentences (CC BY 2.0 FR).
- Korean lessons (33 grammar lessons, TOPIK 1–6): **written for Casus** (tools/curricula/ko/), English and Portuguese;
  no openly licensed TOPIK grammar course or list was found. Words by level (11,030, as Words lessons) and 161,000
  example sentences for the exercises: the **NIKL Basic Korean Dictionary** (한국어기초사전, 국립국어원), CC BY-SA 2.0
  KR, from the export mirrored in github.com/71/study-korean (tools/build_kodict.py). Also Tatoeba's Korean sentences
  (CC BY 2.0 FR).
- Chinese lessons (573, HSK 1–9): the points of the **HSK 3.0 grammar syllabus** (GF 0025-2021, a national standard)
  as extracted with the HSK 3.0 word list by github.com/ivankra/hsk30 (MIT); English and Portuguese labels and the
  explanations of the structural points **written for Casus** (tools/learn_zh_labels.py, tools/curricula/zh/notes.yml);
  English glosses CC-CEDICT (CC BY-SA); sentences Tatoeba (CC BY 2.0 FR), traditional-script sentences left out. The
  Chinese Grammar Wiki (AllSet Learning) forbids commercial use and was not used.
- Finnish lessons (46, A1–B2) **written for Casus** after Iso suomen kielioppi (VISK, Kotus, CC BY 4.0) and
  Wikipedia's Finnish grammar (CC BY-SA), in the order of the usual first- and second-year courses; tables from
  Casus's Wiktionary paradigms; sentences Tatoeba (CC BY 2.0 FR).
- Sanskrit lessons (24) **written for Casus** after Whitney's *Sanskrit Grammar* (1889) and Perry's *Sanskrit Primer*
  (1885), both public domain. Sentences: the **Digital Corpus of Sanskrit** (Oliver Hellwig, CC BY 4.0,
  github.com/OliverHellwig/sanskrit) — Hitopadeśa, Śukasaptati, Vetālapañcaviṃśati, Kathāsaritsāgara, Rāmāyaṇa — in
  their annotated word-by-word (padapāṭha) form, transliterated to Devanagari (tools/build_dcs.py); Tatoeba (CC BY 2.0 FR).
- Czech lessons (30, A1–B2) **written for Casus** after the Internetová jazyková příručka (ÚJČ AV ČR) as summarised in
  Wikipedia's Czech grammar (CC BY-SA); tables from Casus's Wiktionary paradigms; sentences Tatoeba (CC BY 2.0 FR).
- Polish lessons (24, A1–B1) **written for Casus** after Wikipedia's Polish grammar (CC BY-SA); tables from Casus's
  Wiktionary paradigms; sentences Tatoeba (CC BY 2.0 FR).
- Turkish lessons (24, A1–B1) **written for Casus** after Wikipedia's Turkish grammar (CC BY-SA); forms from Casus's
  Wiktionary data; sentences Tatoeba (CC BY 2.0 FR).
- Modern Greek lessons (28, A1–B1) **written for Casus** after Wikipedia's Modern Greek grammar (CC BY-SA); tables
  from Casus's Wiktionary paradigms; sentences Tatoeba (CC BY 2.0 FR).

## Document import

- JSZip (Stuart Knightley and contributors), MIT: reads Word (.docx), OpenDocument (.odt) and EPUB files.
- pdf.js (Mozilla), Apache-2.0: reads the text of PDF files.
Both load only when such a file is opened; the file never leaves the computer.

## Proofreading

- Hunspell compiled to WebAssembly: hunspell-asm (OJ Kwon), MIT; Hunspell itself MPL/LGPL/GPL.
  (Its bundled nanoid 2 carries an advisory about negative or zero sizes and custom generators; hunspell-asm only
  calls it with the default size to name the dictionary files it mounts.)
- Spelling dictionaries, loaded from jsDelivr when the tab is used: dictionary-pt (VERO, pt-BR; LGPL-3.0 or MPL-2.0),
  dictionary-de (GPL), dictionary-el (GPL/LGPL/MPL), dictionary-ru (BSD-3-Clause), dictionary-pl (GPL/LGPL/MPL),
  dictionary-cs (GPL-2.0), dictionary-hu (GPL/LGPL/MPL), dictionary-is (CC BY-SA 3.0), dictionary-tr (MIT),
  dictionary-la (GPL-2.0), dictionary-mk (GPL-3.0), dictionary-ko (GPL/LGPL/MPL) — the LibreOffice dictionaries,
  packaged by Titus Wormer (wooorm/dictionaries).
- Grammar: LanguageTool (LGPL-2.1), run on the reader's computer by tools/languagetool.sh, or its free public API
  (api.languagetool.org) when the reader allows it.

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

## Learn tab: imported courses and generated lessons (2026-10-20)

- **Korean**: the grammar list of the International Standard Curriculum for Korean (국립국어원 NIKL, 2017, list
  revised 2020; KOGL type 1 — attribution: korean.go.kr report 932), 336 points; definitions and examples from
  한국어기초사전 (NIKL, CC BY-SA 2.0 KR).
- **Czech**: Charles Nigrin, *Bohemian Grammar* (1918), Project Gutenberg #50595, public domain.
- **Sanskrit**: the learnsanskrit.org guide (CC BY 4.0, per page).
- **Latin**: Allen and Greenough, *New Latin Grammar*, Dickinson College Commentaries edition, ed. Meagan Ayer
  (CC BY-SA: "freely available for re-use under a Creative Commons Attribution-ShareAlike license"), 255 pages.
- **Hungarian**: Joseph Ginever, *Hungarian Grammar* (1909), Project Gutenberg #76725, public domain; CEFR lessons
  written by AI (Claude) for Casus, marked as such.
- **Ancient Greek**: Wilfred E. Major and Michael Laughy, *Ancient Greek for Everyone* (Pressbooks, 2018),
  pressbooks.pub/ancientgreek, CC BY 4.0: its 48 chapters' text (photos left out), and its exercise sentences as extra
  Greek sentences for the exercises.
- **Generated lessons** (every spaced-script language): function words, verbs, vocabulary and phrases built by Casus
  from Wiktionary (CC BY-SA, via kaikki.org) and Tatoeba (CC BY 2.0 FR); marked "generated" on every page.
