# Casus

A reader for classical Latin. The text stays untouched on the left; on the right the same
words become colour-coded blocks that can be dragged, grouped and sorted until the sentence's
structure is visible. Colour carries case, brightness carries number, and a word whose case is
genuinely ambiguous is shown as ambiguous rather than guessed at.

- Design: `docs/superpowers/specs/2026-08-20-casus-design.md`
- Implementation plan (core): `docs/superpowers/plans/2026-08-20-casus-core.md`
- Data provenance and field layouts: `docs/DATA.md`

## Development

Requires Node 20+ and Python 3.11+.

```bash
npm install                       # JS test harness (vitest)
npm test                          # run the parser module tests
python3 -m pytest tools/tests -q  # run the build pipeline tests
```

`vendor/` holds source data downloaded by `tools/fetch_data.sh` and is not committed. The
derived index under `data/` is built by `python3 tools/build_index.py` (35 s) and is **not
committed yet either**: it is twice the raw size budget the plan set (59 MB on disk, 7.4 MB
gzipped), and whether to ship it as is, trim it, or port a stem+ending engine is an open
decision recorded in `docs/DATA.md`.

## Current state (2026-10-02)

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
