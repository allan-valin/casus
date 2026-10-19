# Casus

A reader for classical Latin. The text stays untouched on the left; on the right the same
words become colour-coded blocks that can be dragged, grouped and sorted until the sentence's
structure is visible. Colour carries case, brightness carries number, and a word whose case is
genuinely ambiguous is shown as ambiguous rather than guessed at.

- Design: `docs/superpowers/specs/2026-08-20-casus-design.md`
- Implementation plans: `docs/superpowers/plans/2026-08-20-casus-core.md` (data + parser),
  `docs/superpowers/plans/2026-10-02-casus-ui.md` (the page)
- Feedback and status after the first hands-on session: `docs/FEEDBACK-2026-10-18.md`
- Data provenance and field layouts: `docs/DATA.md`

## Development

Requires Node 20+ and Python 3.11+.

```bash
npm install                       # with npm 10.8 the lockfile installs as is; if you add packages
                                  # and npm dies on "edgesOut", use --legacy-peer-deps (vitest 5 peer set)
npm test                          # vitest: parser modules, UI helpers and thin component tests
python3 -m pytest tools/tests -q  # the build pipeline tests
bash tools/fetch_data_assets.sh    # downloads the built indexes (data/<code>/) from the `data` release
python3 tools/build_index.py      # or rebuild Latin's from vendor/ (35 s); bash tools/release_data.sh la uploads it
bash tools/fetch_glosses_pt.sh && python3 tools/build_glosses_pt.py   # the Portuguese gloss layer
npm run dev                       # the reader at http://localhost:5173
npm run build && npm run preview  # static bundle in dist/, data/ copied beside it
cd dist && python3 -m http.server # or serve the built bundle offline with nothing but Python
```

`vendor/` holds source data downloaded by `tools/fetch_data.sh` and `tools/fetch_glosses_pt.sh` and
is not committed. The derived indexes under `data/<code>/` live as archives in the repository's `data` release, not in git
history (languages design §11.6); the Pages workflow downloads them at build time. Latin's is 57 MB on disk,
7.3 MB gzipped, every shard under 300 KB gzipped (`docs/DATA.md`).

## The page

**Live:** https://allan-valin.github.io/casus/ — built and published by GitHub Actions from `main`
(`.github/workflows/pages.yml`; Vite `base` comes from `CASUS_BASE=/casus/`). Everything runs in the
browser from static files; it works on a phone and scales with the screen.

The two-pane reader of 2026-10-02 (`docs/superpowers/plans/2026-10-02-casus-ui.md`) was rebuilt on
2026-10-18 from Allan's first hands-on feedback (`docs/FEEDBACK-2026-10-18.md`): every parse decision
still comes from `src/lib/`. The page is one column of numbered cards:

1. **Text.** Demonstration samples (Caesar, Cicero, Vulgate) above a paste box; **Identify grammar**.
2. **Sentences.** Each sentence a bordered, clickable box; the current one highlighted.
3. **Grammar blocks.** Every word of the sentence as a block, full width. Hue = case (six Okabe–Ito
   colours, validated colour-blind-safe pairwise), border = full hue, fill = a tint; singular solid,
   plural dashed, locative double; verbs dark; function words grey dotted. An **ambiguous** block is
   white with `?` and one dot per possible case — never a blended fill; an unknown word white with `!`.
   Click a block: the dictionary overlay (entry, gloss with its language badge, age, frequency, every
   surviving reading with its reason, pin/unpin); click it again or the backdrop or Escape to close.
   **Drag** a block: the others stay still, a caret marks the gap, the move happens on release
   (pointer events, no library; Alt+←/→ on a focused block too). Prep + object are a glued chunk with
   ⛓ to unglue; hovering lights agreement partners. Arrange: restore, auto-sort by case, and the word
   orders **SVO SOV VSO VOS OVS OSV** (S = nominative, V = verb, O = accusative, the rest follows).
   Layer toggles beside the pool; a legend table under it.
4. **Dictionary settings.** "Dictionary period" (dates and example authors) and "Dictionary language".

**Languages (2026-10-18, phase 1).** The page is now one instance of a *language definition*
(`src/lang/<code>/`: script, inventory of cases and other channels, segmenter, tokenizer, cascade stages,
eras, data and sample paths, voice); colours and legend are generated from the inventory. A bar at the top
lists the shipped languages; the path selects one (`/` Latin, `/<code>/`, `/<code>/drills/` for its drills,
`/drills/` for Latin's: letters for non-Latin alphabets, noun and verb endings for every language; old
`/<code>/game/` links still work; model words and their random-word pools from `tools/build_drills.py <code>`;
frequent words and phrases from `python3 tools/build_wordlists.py <code>` then `node tools/build_wordlists.mjs <code>`). Design: `docs/superpowers/specs/2026-10-18-casus-languages-design.md`; plan:
`docs/superpowers/plans/2026-10-18-casus-languages-phase1-2.md`. Every entry now shows the **IPA**
(Latin's from Wiktionary, the variant matching the dictionary period: Classical or Ecclesiastical), a
**Wiktionary link**, and a **🔊 speaker**: the browser's own voice for the language, else espeak-ng
loaded from jsDelivr on first use. **Open a text file…** reads a `.txt`/`.md` as the text.

**Ancient Greek (2026-10-18, phase 2)** at `/grc/`: the English Wiktionary's Ancient Greek entries
(22,757 lemmas, 871k forms, every dialect, `data/grc/` 49 MB) on the same page. Five cases, the dual on a
double border, the article as agreement witness, Smyth's prepositions, elided words looked up as their full
forms, periods that choose the pronunciation (Attic, Koine, Byzantine…). Text typed **without accents**
still finds its words: the page matches it against the accented spellings and shows the dictionary's
spelling above the block and over the word (toggle "accents from the dictionary"). `/grc/drills/` has the
**letters drill** and the endings drills. Grammar notes: `docs/languages/grc.md`; build: `bash tools/fetch_wiktextract.sh
"Ancient Greek" && python3 tools/build_lang.py grc`.

**Every dictionary entry shows its whole declension or conjugation** (all three languages): the cells
holding a reading still open for the word have a border and background, the same spelling in a cell the
rules ruled out is dashed, and the sections containing the word open first (`tools/build_paradigms.py`).

**German (2026-10-18, phase 3)** at `/de/`: the English Wiktionary's German entries (100,980 lemmas, 442k
forms, `data/de/` 47 MB). Every noun shows its **article** (der / die / das, die (Pl.)) above the word,
because gender decides the adjective endings. A preposition governs its **whole noun phrase** (`mit dem
guten Wein` is dative throughout and moves as one chunk); Wechselpräpositionen stay two-coloured until the
phrase settles them. Inside a noun phrase everything takes its noun's case, number and gender, and the
article word decides the adjective declension; clauses (between commas) give the verb its person and number,
put the finite verb last in a subordinate clause, and read a clause-final participle or infinitive as the
verb's partner. Commas and full stops travel with the word before them. The rules, with what is applied and
what comes next: `docs/languages/de.md` §10. A sentence-initial capital is read both ways (`Essen ist gut`: noun and verb). In the
dictionary settings, an optional **natural voice** (Thorsten, Piper, 63 MB) downloads on request and the
speaker uses it. Grammar notes: `docs/languages/de.md`; build: `bash tools/fetch_wiktextract.sh German &&
python3 tools/build_lang.py de`.

**Japanese (2026-10-19)** at `/ja/`: the English Wiktionary's Japanese entries (85k lemmas, 661k forms in kanji
and kana, plus the everyday conjugations the tables lack). Text without spaces is cut into dictionary words;
particles give the word before them its role (topic, subject, object, target…) on the case hues; furigana over
kanji and hiragana over katakana (toggle), romaji under each word; kana, conjugation, JLPT and phrase drills.
Notes: `docs/languages/ja.md`; build: `bash tools/fetch_wiktextract.sh Japanese && python3 tools/build_lang.py ja`.

**Arabic (2026-10-19)** at `/ar/`: right to left; 31k lemmas, 489k vowelled forms (common verbs only). Bare
text finds the vowelled spellings, which are supplied over the block; proclitics (و ف ب ل ك) split off;
three cases, prepositions with the genitive, verb–subject–object, adjective agreement; alphabet (alone and
joined), table, frequency and phrase drills. Notes: `docs/languages/ar.md`; build:
`bash tools/fetch_wiktextract.sh Arabic && python3 tools/build_lang.py ar`.

**Russian (2026-10-19)** at `/ru/`: 45,800 common lemmas; stress supplied over unstressed text; six cases,
prepositions with their cases, agreement, verb number, one subject per clause; aspect pairs in the dictionary
form; Cyrillic, table, frequency and phrase drills. Notes: `docs/languages/ru.md`; build:
`bash tools/fetch_wiktextract.sh Russian && python3 tools/build_lang.py ru`.

Top corner: **English ⇄ Português** (the page and the dictionary language together, remembered),
exports (JSON to reload, Markdown to read) and **?** — what is on screen, how to use it, every
resource and licence. Under the page, **What is happening**: one timestamped line per action and its
outcome, a bar across the top while a request is open, a "slow" line after four seconds.

`tools/ui_check.mjs` drives all of it in headless Chromium (samples, chunk, dictionary, pin, drag of a
word and of the chunk, reload, overlay closing, help, the Portuguese switch, zero horizontal overflow
at 390 px): `npm install --no-save playwright && npx playwright install chromium`, then
`npm run dev -- --port 5198 &` and `node tools/ui_check.mjs <screenshot-dir>`.

Known limitations, carried forward:

- Identical readings from different Whitaker entries are folded at display time (CLI and the
  candidate list show `×2`); the blocks still carry one candidate per entry.
- A preposition's object is the next word (adjacency); anastrophe is the reader's unglue case.
- Stage 2 narrows an adjective against any agreeing nominal, not its head; the reason names the
  witness and the soft link lights it up, so the reader can repin.
- `-que`/`-ue`/`-ne` are split by the tokenizer and rejoined by `state.js` when the whole form is
  attested; a word that is both attested whole and a host stays whole.
- Dictionary forms print the bare genitive ending (`legio, -is`), not the stem change (`-onis`).
- Packons (`quicumque`) and most proper nouns are not in Whitaker's lexicon and show as `!`.
- Portuguese glosses cover 1,718 lemma records (4.5%; 12.1% of the frequent ones) from the Portuguese
  Wiktionary; the entry falls back to English with the badge flipped. The reasons in the candidate
  list are the parser's and stay in English.
- The class sub-layer needs the lemma table, which loads after the first parse (5 MB raw).
- Rarity is shown, not filtered: `est` offers *edō* beside *sum*.
- Sentence splitting guards Roman numerals in capitals only, so an ALL-CAPS text is one sentence;
  a sentence-final `a` is read as the praenomen abbreviation.

## The CLI (core plan, 2026-10-02)

The core plan's data pipeline and parser modules are built, reviewed and tested (101 JS tests,
83 Python tests). The end-to-end deliverable is the CLI:

```bash
python3 tools/build_index.py              # once, needs vendor/ fetched
npm run parse -- "Caesar in Galliam magnam cum legione venit."
```

```
  0 ? Caesar
       noun nom sg m <caesar, -is m.>  [lexicon: attested form]
       noun voc sg m <caesar, -is m.>  [lexicon: attested form]
  1 ? in
       prep acc <in> ×2  [lexicon: attested form; government: in + acc (object Galliam is accusative)]
  2   Galliam
       noun acc sg f <gallia, -ae f.>  [lexicon: attested form; government: governed by in (acc)]
  3   magnam
       adj acc sg f pos <magnus, -a, -um>  [lexicon: attested form; agreement: matches Galliam (acc sg f)]
  4 ? cum
       adv pos <cum>  [lexicon: attested form]
       prep abl <cum>  [lexicon: attested form; government: cum + abl (object legione is ablative)]
  5   legione
       noun abl sg f <legio, -is f.>  [lexicon: attested form; government: governed by cum (abl)]
  6 ? venit
       verb 3 sg pres ind act <ueneo, -re>  [lexicon: attested form]
       verb 3 sg perf ind act <uenio, -ire>  [lexicon: attested form]
       verb 3 sg pres ind act <uenio, -ire>  [lexicon: attested form]
```

`?` marks a block the cascade left ambiguous; `!` one the lexicon does not know; `×2` folds
readings that print the same (Whitaker lists `in` once per governed case). What this
shows: `Galliam` resolved and pulling `in` to the accusative, `cum` governing `legione` as
ablative, `magnam` settled by agreement with `Galliam`, and `Caesar` honestly left between
nominative and vocative — which is the app doing its job (spec §4).

Known limitations, for the UI plan:

- Identical readings from different Whitaker entries are folded only at display time; the
  blocks still carry one candidate per entry, and the UI will want the same fold.
- A preposition's object is the next word (adjacency); anastrophe (`quem circum`) is the
  reader's unglue case.
- Stage 2 narrows an adjective against any agreeing nominal in the sentence, not its actual
  head; the reason names the witness so the reader can repin.
- `-que`/`-ue`/`-ne` are split by the tokenizer and rejoined by `state.js` when the whole form
  is attested (`legione`), so a word that is both attested whole and a host stays whole.
- Dictionary forms print the bare genitive ending (`legio, -is`), not the stem change (`-onis`).
- The Portuguese glosses (plan Task 8) are not built; the English ones are.
- Packons (`quicumque`, `quisque`) are not in the lexicon until `ADDONS.LAT` is folded in;
  proper nouns are thin in Whitaker (`Troiae`, `Lavinia` come back *not in lexicon*).
- Rarity is shown, not filtered: `est` offers *edō* "eats" beside *sum*; `vis` offers *vīsō*.
  The frequency tag on the lemma is the UI's cue (spec §8).

Also parsed on the way, so the claims above are not one sentence's luck: *Quis est?* (`est`
→ *sum* and *edō*), *Sumus et imus.* (both resolved), *Senatus populusque Romanus hortatur
milites.* (`hortatur` *3 sg pres ind act* of the deponent, `Senatus` keeps its noun readings
beside the agreeing adjective), and the Aeneid's first line.
