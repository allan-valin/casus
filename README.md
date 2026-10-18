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
