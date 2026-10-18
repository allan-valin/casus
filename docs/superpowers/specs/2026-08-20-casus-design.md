# Casus — Latin case-block reader

**Status:** design approved 2026-08-20; core and page built 2026-10-02; page rebuilt from Allan's
feedback and published 2026-10-18 (`docs/FEEDBACK-2026-10-18.md`). **Amendments decided 2026-10-18:**
v2 OCR (§10.2) uses Desembarque's engine (kraken PP-OCRv6 + second reading), not tesseract.js; the UI
language is a flag (English ⇄ pt-BR) covering the chrome and the dictionary; the page is phone-friendly
and scales to any resolution (the desktop-only non-goal in §2 is revoked); the drag is the page's own
pointer-event implementation with a caret preview, replacing the drag library chosen in §12.
**Repo:** `/home/allan/projects/casus`
**App #6.** See also `desembarque` (#4, OCR), `score-app` (#5).

## 1. Problem

Classical Latin word order is free, and authors exploit that for style. A single period runs
for lines, and the words that belong to one another — a noun and its adjective, a preposition
and its object, a verb and its subject — end up scattered across the whole sentence. The
reader reassembles them by matching inflectional endings: all the accusative singular
1st-declension `-am` words in a period usually point at the same thing, but they may sit two
lines apart.

Doing that reassembly is the actual work of reading Latin, and it is invisible — it happens in
the reader's head, with nothing on the page to hold partial results.

Casus makes it visible and manipulable: the text stays untouched on the left, and on the right
the same words become colour-coded blocks that can be dragged, grouped and sorted until the
structure is obvious.

## 2. Goals and non-goals

**v1 goals**

- Read a real Latin passage faster than unaided, by seeing case agreement instead of deducing it.
- Demoable in about 30 seconds on a bundled passage — this is a portfolio piece as well as a
  study tool.
- Runs offline, from a static host, on commodity hardware.

**Explicit non-goals for v1**

OCR of any kind; PDF intake; case lanes; translation scratch pane; Lewis & Short sense dating;
Saraiva dictionary ingest; user accounts; cross-device sync; mobile-first layout (it is a
desktop two-pane reading tool).

**Never a goal:** producing a translation. Casus shows structure. It does not tell the reader
what the sentence means, and it must not do the puzzle for them.

## 3. Users

Primary: Allan, reading real classical texts. Secondary: an interviewer being shown the app
cold. Both are served by the same build; the bundled sample passages exist for the second.

## 4. Core principle: ambiguity is shown, never guessed

Latin endings are heavily syncretic:

| Form | Possible analyses (partial) |
|---|---|
| `-a`  | nom sg f, abl sg f, nom pl n, acc pl n, imperative |
| `-is` | dat pl, abl pl, gen sg (3rd), 2sg present |
| `-am` | acc sg f (1st), 1sg imperfect subjunctive |

An ending-matcher that picks one reading will be confidently wrong constantly. The rule, which
applies everywhere in the UI and the parser:

> A block never displays a single case unless the evidence supports exactly one. Ambiguous
> blocks display every surviving candidate and narrow as evidence arrives.

This is the same per-field-confidence stance Desembarque takes with mangled names: surface the
uncertainty, never silently guess. It is also pedagogically correct — a human reader holds the
same ambiguity open until the sentence resolves it.

### 4.1 Disambiguation cascade

Ordered cheapest first. Each stage **narrows** a candidate set and may never empty it; if a
stage would remove the last candidate, the stage is wrong and its result is discarded.

1. **Lexicon lookup.** The dictionary entry fixes part of speech, declension or conjugation
   class, and gender. This kills most cross-POS and cross-class readings before any syntax
   runs — `rosa` as a known 1st-declension noun drops every verb and 3rd-declension analysis
   immediately. This is why the dictionary is a **core parser input**, not merely the popup
   feature: one component pays for both.
2. **Agreement.** Adjective–noun, participle–noun and appositive matches within the selected
   sentence collapse remaining pairs. This is the only stage that can separate 1st-declension
   nominative singular from ablative singular, which stage 1 cannot touch.
3. **Government.** A governing preposition or verb frame picks accusative against ablative.
   Bidirectional with the preposition itself (§7.3).
4. **Unresolved.** Whatever survives all three stays multi-valued and renders striped. That is
   the honest answer.

Manual pins (§7.4) enter the cascade as fixed facts and cause a re-run, so one human decision
propagates through agreement to other blocks.

## 5. Architecture

Two halves with a hard boundary: an offline build that produces data assets, and a browser
runtime that only reads them. Nothing heavy runs in the request path.

### 5.1 Offline build (Python, run rarely, output committed)

```
Whitaker's WORDS  DICTLINE + INFLECTS      (public domain)
        │
        └─ build_index.py ──► forms/<aa>.bin      form → [analysis, ...]
                              lemmas.json         lemma metadata
                              glosses.en.json     English glosses
pt.wiktionary dump (Wiktextract) ──► glosses.pt.json   (CC BY-SA, separate NOTICE)
```

An **analysis** is `{lemma_id, pos, case, number, gender, degree}` for nominals and
`{lemma_id, pos, person, number, tense, mood, voice, conjugation}` for verbs.

Lemma metadata carries: dictionary form (`rosa, -ae f.`), declension or conjugation class,
gender, **age code** (Archaic / Early / Classical / Late / Medieval / Renaissance / Neo-Latin)
and frequency tag. Both come from the Whitaker dataset — no extra source needed.

Sharding: `forms/` split by first two letters so a passage fetches only the shards it needs.
Normalisation: `j→i`, `v→u`, macrons stripped for lookup but preserved for display, so
`Iulius`/`Julius` and `vīta`/`uita` all hit the same key.

### 5.2 Runtime (browser, static, no backend)

```
text → segment → tokenize → lookup → disambiguate → render
                                          ↑
                                    user overrides
```

Five framework-free ES modules, node-testable, importing no UI code:

| Module | Responsibility |
|---|---|
| `segment.js` | Splits on `.` `?` `!` with an abbreviation and numeral guard (`Cn.`, `M.`, `a.d. III Kal.`, Roman numerals, ellipses). Sentences are the selectable units. |
| `tokenize.js` | Words, punctuation, and enclitic splitting (`-que`, `-ve`, `-ne`) — a major source of failed lookups if skipped. Deliberately replaceable: nothing downstream may assume a token came from whitespace splitting (see §10.3). |
| `lexicon.js` | Shard fetch and `form → analyses` lookup. Pure, no state. |
| `disambiguate.js` | The §4.1 cascade as a pipeline of narrowing scorers. Returns surviving candidates with confidence and the reason each survived. |
| `state.js` | Sentence selection, block order, pins, glue state, layer toggles, era, gloss language. Single source of truth. |

Svelte owns rendering and drag events only. Every parse decision is reproducible from
`state.js` plus the pure modules with no DOM present.

### 5.3 Build shape

Vite + Svelte, output a static bundle; magnetic drag from an MIT-licensed library
(`sortablejs` or `dnd-kit`) rather than hand-rolled FLIP animation. Hosting stays free static
hosting. The parser core stays framework-free, so the UI choice is reversible.

## 6. Layout

Two panes, side by side.

- **Left — original.** The source text, read-only, never reordered. The reference.
- **Right — blocks.** The same words as manipulable blocks.

Panes are tied: hovering a block highlights that word on the left; selecting a sentence dims
everything outside it in both panes.

## 7. The block pane

### 7.1 Colour system

Hue = case (nominative, genitive, dative, accusative, ablative, vocative, plus locative where
it occurs). Brightness = number: bright singular, dim plural.

Colour is never the only channel. Every block carries a two-letter case badge
(`Nm Gn Dt Ac Ab Vc`), which keeps the app usable for colour-blind readers, in grayscale
screenshots, and makes any sort explainable.

### 7.2 Layers

Everything is colour-coded, and each layer toggles independently:

- **nominal** — nouns, adjectives, pronouns, participles: the case hues
- **verb** — its own colour family; badge is person·number·tense (`3sg pf`)
- **function** — prepositions tinted with the case they govern; conjunctions and particles neutral

Turning verb and function layers off leaves cases alone on screen — the original idea, one
keystroke away.

**Class sub-layer**, off by default so it never competes with case:

- verbs: `I II III III-iō IV` badge plus a tint step inside the verb family. (Verbs do not
  inflect for gender; the fifth class is 3rd-conjugation `-iō` (*capiō*), which patterns
  between 3rd and 4th.)
- nouns: declension `1–5` badge plus a gender marker `m f n`. Gender earns its space because
  it is what makes adjective agreement resolvable in stage 2.
- adjectives: 1st/2nd-declension against 3rd-declension type.

### 7.3 Prepositions

A preposition is tinted with the case it governs, and is a strong stage-3 signal for its object.

- Unambiguous governors render solid: `ab ex cum de pro sine` ablative; `ad ante per trans
  inter` accusative.
- `in sub super subter` govern both and render striped accusative/ablative.
- Resolution is **bidirectional**: an unambiguous object settles the preposition (`in urbe` →
  ablative, "in the city"); an unambiguous preposition settles the object (`in Galliam` →
  accusative, "into Gaul").
- When both are ambiguous, both stay striped. That pair genuinely needs the verb's motion
  sense, which is beyond v1's cascade — and showing it unresolved is correct.

### 7.4 Ambiguity display and pins

An unresolved block renders striped in its candidate hues with a `?` badge. Tapping it opens
the candidate list, each entry showing the reason it survived
(`abl sg — 1st decl, no preposition, no agreeing adjective`).

Choosing a candidate **pins** it: the block takes a dotted border marking it as the reader's
call rather than the parser's, and the cascade re-runs. Pinning `urbem` as accusative can
resolve `magnam` by agreement — one decision cascades. Undo restores the parser's view.

### 7.5 Chunks: glue and unglue

A preposition and its governed object glue into a single outlined draggable unit — drag either,
both move. The link icon between them unglues and re-glues, because poets separate them
(anastrophe: `quem circum`) and the reader must be able to say so.

Adjective–noun agreement is a **soft link**: a connector line on hover or selection, but the
words drag independently. Separating them is precisely what the reader wants to undo by hand,
so gluing them would do the puzzle for them.

### 7.6 Motion

One magnetic wrapping pool per selected sentence. Dragging a word inserts it at the nearest
gap; neighbours slide out of the way; blocks never overlap.

Every block keeps a small superscript index of its position in the original text, so no
arrangement can lose the reading order, and `restore original order` is always one click.

`auto-sort` reorders the pool so same-case blocks are adjacent, stable by original index
within each group.

## 8. Dictionary

Tapping a block opens: lemma in dictionary form (`rosa, -ae f.`), class, gloss, age code,
frequency tag, and the full morphological candidate list for that surface form.

**Era awareness (v1).** The reader sets the text's period once. Entries and senses outside it
dim, with a warning when a word's only attested sense is Medieval and the text is Ciceronian.
The frequency tag shows alongside — a rare-word reading is usually the wrong reading, and it
is free signal from the same dataset.

Full per-sense dating from Lewis & Short citation authors is **v2**: it requires ingesting a
large, messy XML corpus and building an author→date map before anything renders.

**Gloss language.** The gloss file is a pluggable layer:

- `glosses.en.json` — Whitaker, public domain, always ships, always the fallback
- `glosses.pt.json` — built offline from the Portuguese Wiktionary dump via Wiktextract;
  pt-BR preferred where the dump distinguishes

Coverage of the Portuguese set will be partial — good on common vocabulary, gaps in the tail —
so the popup shows a language badge and falls back to English with the badge flipped rather
than showing an empty entry. The language toggle sits beside the era control.

**Licensing note.** Wiktionary content is CC BY-SA, not public domain. It is compatible with
the open-source-only rule, but the built `glosses.pt.json` carries attribution and share-alike
obligations, so it ships as a separately-licensed asset with its own NOTICE file and is never
blended into the Whitaker-derived data. Saraiva's *Novíssimo Dicionário Latino-Português* is
the richer Portuguese source and old enough to be very likely public domain, but exists only
as page scans — an OCR sub-project, deferred to v2, and a natural reuse of the Desembarque
pipeline.

## 9. Persistence and export

Autosave to `localStorage`, keyed by a hash of the text, debounced about 300 ms after any
change. `localStorage` survives an accidental close, a crash and a reboot — it is not
session-scoped — so there is no save button and no reliance on the reader remembering.

A `beforeunload` guard fires only while a write is still pending. It stays narrow on purpose:
browsers show their own generic wording and ignore custom text, and a page that always nags on
exit trains the reader to click through it.

Restored on load: arrangement, pins, unglued chunks, layer toggles, era and gloss language.

Export produces a JSON document (text, arrangement, overrides) and a Markdown rendering for
reading elsewhere. The translation scratch pane is v2.

## 10. Input

### 10.1 v1 — paste and bundled passages

v1 accepts pasted text and a small set of bundled passages (Caesar, Cicero, Vulgate) for the
cold demo — so the demo never depends on OCR quality.

Sourcing: the works themselves are ancient and long out of copyright, and The Latin Library
(`thelatinlibrary.com`) is the convenient place to collect them. Two cautions, since the
bundled texts ship inside the repo:

- The site publishes no explicit licence and its texts are volunteer transcriptions of
  varying provenance. The underlying works are public domain, but a *particular modern
  critical edition* can carry its own rights in its apparatus and editorial choices.
- Therefore: bundle **short passages only** (a paragraph or two each, enough for the demo),
  record the source and edition for each in `data/samples/SOURCES.md`, and prefer texts
  cross-checkable against Perseus, which states its licence (CC BY-SA) explicitly.

This is a small, easily-satisfied obligation, and doing it wrong is the kind of thing an
interviewer notices in a portfolio piece.

### 10.2 v2 — OCR and PDF

v2 adds image OCR through `tesseract.js` WASM with Latin traineddata, which requires an
editable correction step before parsing: OCR errors feed the parser garbage, and a wrong
character produces a confidently wrong morphological analysis. PDF intake follows, splitting
into text-layer extraction and image-page OCR as two separate paths.

### 10.3 Scriptio continua (v2, opt-in mode)

Inscriptions, monuments and the earliest manuscripts are written **without word division** —
no spaces, no lowercase, often no punctuation. If such a text ever reaches the app (pasted
from an epigraphic corpus, or via OCR of a monument photograph), the tokenizer's basic
assumption fails before any morphology runs.

Handling it is a **word-segmentation problem solved with the assets the app already has**: the
lexicon and the morphological analyser. The same principle as everywhere else applies — the
app proposes, shows alternatives, and never silently commits.

**Approach.** Over the unsegmented string, score every candidate split with a dynamic-programme
pass:

1. **Lexical** — does each proposed piece exist as a real inflected form in the form index?
   Pieces with no lookup hit are heavily penalised.
2. **Morphological** — do the resulting analyses form a plausible sequence? A run with no
   finite verb, or an adjective agreeing with nothing, scores worse than one that parses.
3. **Frequency** — prefer common words over rare homographs, using the frequency tag already
   in the lemma table.

The best-scoring segmentation renders as normal blocks; competing segmentations are reachable,
because this is genuinely ambiguous and famously so. Boundaries are **draggable**: the reader
moves a split point and everything downstream re-parses, which is the same manipulate-until-it-
makes-sense interaction the rest of the app is built on.

**Epigraphic conventions to handle in the same pass:**

- all-capital text, and no `U`/`V` or `I`/`J` distinction — already covered by the
  normalisation in §5.1
- interpuncts (`·`) used as word separators, which are a *gift*: where present, treat them as
  hard boundaries the segmenter may not cross
- standard inscriptional abbreviations (`COS`, `S·P·Q·R`, `D·M`, `F`, `PONT·MAX`) — a small
  hand-built expansion table, since they are frequent, closed-class and would otherwise
  poison the lexical score
- ligatures and damaged or restored text conventionally marked `[...]` — treat bracketed
  restorations as low-confidence input and mark those blocks accordingly

**Why v2, not v1:** it is a second parser with its own scoring model, and it is worthless
until the ordinary path is solid. But the design must not preclude it — hence the tokenizer
boundary in §5.2 stays a replaceable module, and nothing downstream may assume that a token
came from whitespace splitting.

## 11. Testing

TDD throughout; tests precede implementation.

- **Parser modules** are pure and node-tested against a fixture corpus of hand-annotated
  sentences with expected candidate sets. The central assertions: the cascade narrows
  correctly, **never empties a candidate set**, and **never drops the true reading**.
- **Segmentation** gets golden tests on the edge cases: `Cn.`, `a.d. III Kal.`, ellipses,
  Roman numerals, quotation.
- **Tokenizer** gets enclitic-splitting cases and `i/j`, `u/v`, macron normalisation.
- **UI** gets thin component tests for magnetic reflow and glue/unglue only. Verification by
  assertion, not screenshots.

## 12. Open questions for the implementation plan

1. Measured size of the expanded form index after sharding and compression — decides whether
   the precomputed table survives contact with first-load budget, or whether a stem+ending
   engine port becomes necessary after all. **Worth a spike before the plan is written.**
2. Which MIT drag library actually supports magnetic displacement plus glued multi-word chunks
   without fighting the library — `sortablejs` and `dnd-kit` both need a spike.

   **Answered 2026-10-02 (spike in `spikes/drag/`, measured in headless Chromium):**
   `svelte-dnd-action` and `sortablejs` tie on magnetic displacement, glued chunks and the
   wrapping pool; `svelte-dnd-action` alone has keyboard reorder and a Svelte-native API, so it
   is the one the UI uses. `dnd-kit` is React-only and was not spiked. `sortablejs` is not
   installed in the app.
3. Coverage measurement of `glosses.pt.json` against a real passage's vocabulary, to know
   whether the Portuguese layer is a headline feature or a partial convenience.

## 13. Sources and licences

| Source | Use | Licence |
|---|---|---|
| Whitaker's WORDS (DICTLINE, INFLECTS) | form index, classes, glosses, age codes, frequency | public domain |
| Portuguese Wiktionary via Wiktextract | `glosses.pt.json` | CC BY-SA — separate NOTICE |
| Perseus / Morpheus, Lewis & Short | v2 sense dating | to verify before v2 |
| `sortablejs` / `dnd-kit` | magnetic drag | MIT |
| `tesseract.js` + Latin traineddata | v2 OCR | Apache 2.0 |

All open source, per the standing constraint. No commercial or proprietary dependency.
