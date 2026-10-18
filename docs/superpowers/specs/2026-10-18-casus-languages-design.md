# Casus for many languages — design

**Status:** design written 2026-10-18 from the conversation with Allan of the same day, after the
Latin page went live (`docs/FEEDBACK-2026-10-18.md`). Builds on the Latin design
(`2026-08-20-casus-design.md`): everything there stays true; this document says what generalises
and what each new language adds.

## 1. Intent

Casus is a reader that puts grammar on the page: the text stays as written, its words become
blocks that carry what the grammar says about them, and the reader drags, pins and sorts the
blocks until the sentence's structure shows. Latin exists. Allan wants the same instrument for
the languages he reads and studies — ancient and modern, Latin alphabet and not — and, for the
modern ones, the tools around reading that are usually paywalled or scattered: a dictionary
with pronunciation, an alphabet drill, a spellchecker, a grammar checker.

Why now: the Latin page works and is public; its professors and interviewers will see one
language and ask about others. And Allan's own languages (Portuguese, German, Macedonian,
Japanese among them) are the ones he wants the tool for.

## 2. Goals, non-goals, anti-goals

**Goals**

- One site, one skeleton, many languages. A navigation bar at the top lists them; Latin is the
  landing page. Every language page has the same five parts: text, sentences, blocks, dictionary
  overlay, settings and log.
- Order of delivery, as Allan set it: **Ancient Greek, German, Japanese, Arabic, Russian, Korean,
  Chinese, Macedonian**; then Finnish, Sanskrit, Modern Greek, Czech, Polish, Turkish, Hungarian,
  Icelandic, Portuguese (pt-BR). Ancient Greek first because it is the closest to Latin and
  proves the generalisation.
- A language's own grammar decides what a block shows. Casus never reduces a language to Latin's
  cases: for each language the builder finds that language's grammatical tradition (its school
  grammar, in its own terms) and the markings a reader of that language wants — see §5.
- Ambiguity is shown, never guessed (Latin §4), in every language and for every marking.
- Every language, ancient or modern: an IPA transcription in the entry and a speaker button.
- Every non-Latin alphabet: a memorisation game.
- Modern languages: spelling and, later, grammar checking, offline and free.

**Non-goals (v1 of each language)**

- Translation. Casus shows structure; it does not say what the sentence means.
- Machine-translated glosses. A gloss comes from a dictionary a human wrote.
- OCR and PDF intake (v2 of Latin; reuses Desembarque's engine when it comes).
- Accounts, sync, anything server-side at runtime. The site stays static.

**Anti-goals** (a failure even if it technically works)

- A block that shows one confident role or case when the evidence allows two.
- A language page that is a Latin page with the labels renamed: German without gender, Japanese
  without particles and verb forms, Chinese cut into "words" by whitespace.
- Data so large the site stops fitting on GitHub Pages, or so trimmed that common words are
  missing from the dictionary.

## 3. Constraints

- Open source and open data only (`open-source-only`). Dictionaries: English Wiktionary via
  Wiktextract (kaikki.org, CC BY-SA/GFDL), per-language editions where useful (pt.wiktionary
  for Portuguese glosses, as Latin does), public-domain classical lexica where they exist
  (Latin: Whitaker). Each data asset carries its licence in NOTICE.md; CC BY-SA assets never
  blend with public-domain ones.
- Static hosting on GitHub Pages: 100 MB per file, about 1 GB per site. The Latin index is
  57 MB raw / 7.3 MB gzipped. Budget: **≤ 60 MB raw per language** on disk, every shard
  ≤ 300 KB gzipped, measured and recorded in `docs/DATA.md` as Latin's was. If the sum of
  languages outgrows one site, each language family moves to its own repository and Pages site,
  linked from the bar; the skeleton does not change.
- Commodity hardware and phones (`target-hardware-any-pc`): nothing heavy in the request path.
  Models (TTS voices, parsers) are optional downloads the reader triggers, cached by the
  browser, never required for the page to work.
- UI in English and Brazilian Portuguese (the flag that exists), extendable to the page's own
  language later.
- TDD; headless Chromium check per language page; verification by assertion.

## 4. Architecture: the language definition

The Latin page becomes a parameterised instance. A **language definition** (one module per
language under `src/lang/<code>/`) supplies everything that differs:

| Part | What it holds | Latin today |
|---|---|---|
| `script` | alphabet, normalisation (case folding, diacritics, variant letters), direction, whether words are space-separated, optional furigana/reading layer | `j→i`, `v→u`, macrons |
| `inventory` | the categories a block can carry, grouped into **channels**: case, role, gender, number, tense/mood, politeness, particle kind… each with its values, two-letter badges, legend names in en/pt, and which channel owns the hue | 7 cases on hue, number on border |
| `lexicon` | shard lookup (form → analyses), lemma records, glosses per language, IPA, Wiktionary link | format 2 shards |
| `segment` | sentence boundaries for that script (`.?!`, `。！？`, Arabic `؟`) | abbreviation guard |
| `tokenize` | words and clitics; for scripts without spaces, dictionary-driven segmentation with draggable boundaries (Latin spec §10.3) | enclitic split |
| `cascade` | the narrowing stages: lexicon → agreement → government → (modern) particles / word order / parser; each stage declares what it can resolve | three stages |
| `arrange` | the word-order patterns offered (SVO… for case languages; topic–comment for Japanese) | six orders |
| `game` | the alphabet drill: rows, readings, modes | none |
| `voice` | TTS: BCP-47 tag for the browser voice, optional natural voice (Piper model id and size) | none yet |

The page, the overlay, the log, persistence, export and the colour system are shared and read
the definition. **Hue = the channel the language puts first** (case for case languages, role
for the others); the palette stays the validated Okabe–Ito six plus neutral; a channel with more
than six values folds its rarest into border styles and badges, as Latin's locative does.
Secondary channels ride on border style, badge text and small markers (gender ♂♀⚲ or m/f/n,
politeness, tense), each a toggle in "Colour these word kinds".

**Three flavours**, all the same skeleton:

1. **Case languages** (Ancient Greek, German, Russian, Arabic, Sanskrit, Finnish, Czech, Polish,
   Hungarian, Icelandic, Modern Greek, Turkish): the Latin cascade with the language's inventory.
   German adds gender as a first-class marker because adjective endings depend on it.
2. **Caseless, marker-bearing** (Japanese, Korean; Macedonian with its clitics): hue = role, read
   off particles and clitics the way Latin reads endings. Blocks additionally show the verb form,
   politeness level and particle kind the language's grammar names (for Japanese, the categories
   of nihongotojapan's grammar pages: て-form, た-form, ます, plain, potential, causative…).
3. **Caseless, unmarked** (Chinese, Portuguese): hue = role, but no ending or particle gives it, so
   a block is **unresolved until the parser phase** (§8) supplies roles with a confidence; below
   the threshold it stays white with `?`. Until then these pages are dictionary, IPA, voice,
   reordering and the markings the lexicon alone supports (part of speech, gender, tense class).

## 5. Each language's grammar is its own

For every language the builder, before writing its inventory, researches that language's
grammatical tradition and records in `docs/languages/<code>.md`: the categories its own school
grammar uses (in the language's terms with English and Portuguese labels), which of them a
reader marks on a page, which the lexicon can supply, which need syntax, and the sources used.
Portuguese's list (sujeito, predicado, objeto direto/indireto, adjunto adnominal/adverbial,
complemento nominal, agente da passiva, aposto, vocativo; the tenses incl. futuro do presente /
do pretérito; gender) is the model of the depth wanted, and it is not exhaustive. Every language
gets the same care from its own grammars, not from Portuguese's. The inventory file is derived
from that document and reviewed against it.

## 6. Dictionary, IPA, voice, Wiktionary

- **Entry**: dictionary form, class line in the language's terms, gender where it exists,
  gloss(es) with the dictionary buttons (English Wiktionary; a second edition where built),
  period/register where the source tags it, frequency where known, **IPA** from the extract's
  `sounds` (every language, ancient ones with the reconstructed or conventional pronunciation
  Wiktionary carries), **every surviving reading with its reason**, pin/unpin.
- **Ideograms** (Japanese, Chinese): rikaikun-style — the surface form, all readings, the
  dictionary form behind an inflected one with the deinflection path, and the characters one by
  one with their readings and meanings.
- **Speaker button**: the browser's `speechSynthesis` voice for the language's BCP-47 tag by
  default (works offline once the OS has the voice, quality varies). An optional **natural voice**
  per language: a Piper model (open, MIT; Thorsten for German is one) downloaded on request,
  cached, run in the page with onnxruntime-web. Sizes recorded per voice; the button says which
  voice is speaking.
- **Wiktionary link**: every entry links to `https://<edition>.wiktionary.org/wiki/<word>#<Language>`
  for the English edition and for the page's UI language edition. Optional live fetch of
  another edition's page through the MediaWiki REST API (`/api/rest_v1/page/html/<word>`) shown
  inside the overlay; needs internet, says so.

## 7. Scripts, furigana, segmentation, the game

- **Furigana** (Japanese): small hiragana above every kanji **and** above katakana, from the
  lexicon's readings; toggle in the settings; the text pane's font a step larger on ideogram
  languages so the ruby stays legible. A space is inserted after grammatical markers (particles,
  inflection tails: が, を, に, した, いる, ます…), which are never kanji, so the eye finds word
  boundaries as NHK Easy's layout does.
- **Segmentation without spaces** (Japanese, Chinese): dictionary-driven, longest-match with a
  lexical + frequency score (Latin §10.3's design), boundaries draggable, competing splits
  reachable. Japanese deinflection follows rikaikun's rule table (its own, MIT-free: the table is
  rebuilt from the grammar, not copied).
- **Right-to-left** (Arabic): the text pane and the pool lay out RTL; badges and indices stay
  LTR inside the pill. Arabic case endings are mostly unwritten (no vowels), so the inventory
  records case as *usually unresolved unless written* — an honest page, not a guessed one.
- **The alphabet game** (one per non-Latin script: Greek, Cyrillic, Arabic, hangul, kana; kanji by
  frequency band later): choose the rows to drill, see a character, type its reading, instant
  mark, score and streak, a "sound" button, weak characters come back more often. Modelled on
  kana-quiz; its own route under the language, `/<code>/game/`.

## 8. The parser phase (modern languages)

Roles that nothing on the surface marks need syntax. Plan: a small dependency parser per
language trained offline on the **Universal Dependencies** treebanks (open), exported to ONNX,
5–20 MB, loaded on request and run in the page with onnxruntime-web. Dependency labels map onto
the language's own categories (nsubj → sujeito, obj → objeto direto, iobj → objeto indireto,
amod/nmod → adjunto adnominal…). Expected accuracy 85–90 % on textbook prose; the blocks show
the parser's role only above a confidence and stay `?` below it, and the reason line says "parser,
0.92". This phase comes after the case languages; it unlocks Portuguese and Chinese roles and
sharpens Japanese and German.

## 9. Spelling and grammar checking (modern languages)

- **Spelling** in the page: Hunspell compiled to WebAssembly with the LibreOffice dictionary of
  the language (pt-BR: MPL/LGPL, ~2 MB), offline. Misspelt tokens are marked in the text pane
  with suggestions in the overlay.
- **Grammar**: LanguageTool is open source (LGPL) and its rule base covers pt-BR including the
  1990 orthographic agreement; the web product's paywall is on its extras. Run it locally through
  a launcher like Desembarque's, the page talks to `localhost`; the page without it still spells.
  With the parser (§8) in place, checks the server cannot do alone (agreement between a marked
  subject and verb, the normaculta-style rules) become possible on the page; that is the last
  phase.

## 10. Delivery, in order

1. **Skeleton generalised** on Latin: language definitions, navigation bar, inventory-driven
   colours and legend, IPA + speaker + Wiktionary link added to Latin's entry (its IPA from the
   Wiktionary Latin extract). Latin must look and behave exactly as today.
2. **Ancient Greek**: polytonic normalisation, 5 cases, 3 genders, 3 numbers (dual), the article,
   Greek verb system badges, alphabet game, reconstructed IPA.
3. **German**: 4 cases, gender first-class, articles/adjective endings in the cascade, Thorsten.
4. **Japanese**: segmentation, deinflection, furigana, particles → roles, kana game.
5. **Arabic**: RTL, 3 cases mostly unresolved, root/pattern in the entry, alphabet game.
6. **Russian**, 7. **Korean**, 8. **Chinese**, 9. **Macedonian** (Zbor's language; Cyrillic game shared
   with Russian, its own letters added).
10. The rest in Allan's order; then the parser phase; then spelling and grammar.

Each language ships when: its grammar document exists, its data is built within budget and
recorded, its tests pass, the headless check drives its page, and Allan has used it.

## 11. Calls made after the builder check (2026-10-18)

A reviewer read this document as a builder and asked seven questions. Settled here, marked as
the author's calls, so the reader can check them:

1. **Lexical sources are any open data, not Wiktextract alone.** Wiktextract gives glosses, IPA,
   gender/class and the inflection tables that exist; where its form coverage is patchy the
   language's standard open lexicon fills the form table: JMdict + KANJIDIC for Japanese (CC BY-SA,
   what rikaikun uses), CC-CEDICT for Chinese (CC BY-SA), OpenCorpora for Russian (CC BY-SA),
   Perseus/Morpheus for Ancient Greek (CC BY-SA), UniMorph where nothing better exists. Each is a
   converter into the same shard format, each with its NOTICE entry. **Frequency** comes from an
   open corpus-derived list per language (the `wordfreq` data, OpenSubtitles-based lists, or the
   corpus the lexicon itself ranks by), recorded per language; Latin keeps Whitaker's own tag.
2. **Optional models are fetched at runtime from their public hosts** (Hugging Face for Piper
   voices and the parsers Casus publishes, jsDelivr/npm for WASM), cached by the browser, never
   part of the site. "Offline" means: the page and its dictionary work offline from the first
   visit; a voice or parser works offline after its one download. The budget counts dictionaries
   only.
3. **Voice tiers:** natural voice (Piper) if the reader downloaded it → the browser's own voice
   for the language → **espeak-ng compiled to WebAssembly** (GPL, robotic, but it speaks `la`,
   `grc`, `mk` and most of the list; Zbor already relies on espeak) → otherwise the button is
   hidden with a note. No modern-language substitute for an ancient one: Latin is not read with
   an Italian voice beside a reconstructed IPA. Phase 1 therefore ships espeak-ng, so Latin's
   button works on day one.
4. **Japanese and Korean blocks are 文節 / eojeol as glued chunks**: the content word and its
   particle are two blocks glued like Latin's preposition and object — the particle tinted with
   the role it marks, the chunk draggable as one, ⛓ to unglue. Spaces in the text pane fall after
   the particle, as Allan asked. Deinflection stops at the content word.
5. **Grammar document review:** see the open question below.
6. **Data lives in release assets, not in git history.** Each language's built index is attached
   to a GitHub Release (`data-<code>-<date>.tar.gz`); the Pages workflow downloads the current set
   at build time and a script does the same for local development. Latin's committed `data/`
   migrates to the same mechanism in phase 1. Repository history then stays small whatever the
   number of languages; the served-site budget of §3 remains.
7. **Demo passages:** three short samples per language, as Latin has, in current orthography,
   from CC BY / CC BY-SA sources (Wikipedia, Wikisource, Tatoeba) with attribution in
   `samples/SOURCES.md`; pre-reform public-domain texts are avoided for modern languages because
   they fail the lexicon and mislead a learner. Ancient languages keep public-domain classics.

Also decided by the reviewer's reading and kept: the lexicon is an async `lookup(form)` so a
runtime analyser can replace shards for agglutinative languages later; Latin's IPA is a separate
CC BY-SA file joined by lemma, never blended with Whitaker's data; the IPA variant shown follows
the period setting; Mandarin keys simplified and traditional together; the dual gets its own
border style; the bar lists only shipped languages; romanisation is off by default.

**Grammar document review** (the reviewer's question 5): Allan approved the design on 2026-10-18
without choosing, so the default holds — each language is built straight through and he reviews it
in use; the grammar document is there for him to read when he does.

**Added at approval (Allan, 2026-10-18): text file upload.** Beside the paste box, a file picker
accepting `.txt` and `.md` (UTF-8; other encodings detected where the browser can) reads the file
in the page and treats it as pasted text. PDF and images remain the v2 OCR path. Phase 1 adds it
to Latin; every language inherits it.

## 12. Left to the builder

- The exact compact code alphabet for each language's analyses (Latin's format 2 generalised
  to channels); the shard key rules for each script.
- Trimming policy within the 60 MB budget: which entries drop first (by frequency and by
  missing gloss), recorded per language.
- The per-language segmentation scoring, deinflection tables, and arrange patterns.
- Piper voice selection per language and the loading UI.
- The game's scheduling of weak characters.

## 13. Sources

Wiktextract / kaikki.org per-language extracts (CC BY-SA, GFDL), sizes measured 2026-10-18:
Ancient Greek 385 MB JSONL (64,151 words); German 633k senses; Russian 492k; Chinese 391k;
Japanese 237k; Arabic 101k; Korean 82k; Macedonian 77k. Universal Dependencies treebanks (CC
BY-SA / various open). Hunspell dictionaries (LibreOffice, MPL/LGPL). LanguageTool (LGPL).
Piper voices (MIT, voice licences vary, recorded per voice). nihongotojapan.com, todamateria.com.br,
normaculta.com.br and each language's reference grammars as reading, never as data.
