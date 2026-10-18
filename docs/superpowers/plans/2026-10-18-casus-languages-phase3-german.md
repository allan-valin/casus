# Casus Languages, Phase 3 (German) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** German at `/de/`: the English Wiktionary's German entries on the generalised page, gender shown on every noun as its article, prepositions governing their whole noun phrase, and the Thorsten natural voice as an optional download.

**Architecture:** As Greek: a parser per language under `tools/casus_build/de/`, `tools/build_lang.py de`, a definition under `src/lang/de/`. Two core extensions, both opt-in per language so Latin and Greek are untouched: tokens may carry an `altKey` (German sentence-initial capitals), and government may extend over a noun phrase (`government.phrase: true`). Voices gain a first tier, a Piper model the reader downloads (`@mintplex-labs/piper-tts-web` 1.0.5, MIT, from jsDelivr; model `de_DE-thorsten-medium`, 63 MB, stored in the browser's private file system).

**Tech Stack:** as phases 1–2.

**Spec:** `docs/superpowers/specs/2026-10-18-casus-languages-design.md` §4–§7, §10 item 3; grammar `docs/languages/de.md`.

## Global Constraints

- All phase-1/2 constraints (≤ 60 MB raw per language, shards ≤ 300 KB gzipped, ambiguity never guessed, Latin and Greek unchanged, en/pt-BR strings).
- German keys keep case, ß and umlauts (de.md §8).
- The natural voice downloads only on an explicit click that states its size; nothing heavy otherwise.

## Review Focus

1. A sentence starting with a noun (`Essen ist gut.`) keeps both the noun and the verb reading of its first word; mid-sentence `Essen` is only the noun — Task 3 test.
2. `daß` (old spelling, very common in public-domain text) finds `dass` — Task 3 test.
3. `im`, `zum`, `ins` govern their phrase like `in dem`, `zu dem`, `in das` — Task 4 test.
4. A Wechselpräposition with an unresolved phrase stays two-coloured, never picks one — Task 4 test.
5. A reader who never downloads Thorsten never fetches anything from Hugging Face — Task 6 test (no request until the button).

---

### Task 1: German entries and analyses from the extract, size gate

**Files:** `tools/casus_build/de/{__init__,normalize,codes,parse,prepositions}.py`; `tools/build_lang.py` (a `de` builder beside `grc`); `tools/tests/test_de_{parse,codes}.py`; fixture `tools/tests/fixtures/de_sample.jsonl` (Haus, Frau, Mann, gut, der, ein, gehen, haben, sein, in, mit, Essen, essen, dass).

**Interfaces:** `parse_entries(lines)` → `{id, headword, pos, gender, gloss_en, ipa, forms}` (`lang_code == 'de'`, form-of pages skipped; gender from sense tags, else the headword template's `g`/`2` argument). `analyses_of(entry)`: nominal `{pos, case ∈ nom gen dat acc, number ∈ sg pl, gender ∈ m f n, infl ∈ strong weak mixed x, degree}`; verb `{pos, person, number, tense ∈ pres pret x, mood ∈ ind sub1 sub2 imp inf ppl1 ppl2, voice}`; prepositions one analysis per governed case from `prepositions.py` (de.md §6, contractions included). Keys: NFC, case kept. `CODES_JSON` as Greek's with German tables; fixture `tests/fixtures/codes.de.json`; lemma records carry `article` (`der`/`die`/`das`, from gender) and `gender`.

- [ ] Fixture + failing tests: Haus n, `Häuser` nom/gen/acc pl; `gutem` dat sg m/n strong; `der` det with nom sg m, gen sg f, dat sg f, gen pl; `ging` 1/3 sg pret ind; `in` → acc and dat; `im` → dat; `Essen` noun and `essen` verb distinct keys; round-trip codes.
- [ ] Implement; `python3 tools/build_lang.py de`; measure. Over 60 MB: trim in this order, recording each: (1) adjective comparative/superlative inflected forms of lemmas without a frequency-relevant gloss, (2) entries with only archaic/obsolete/dialectal senses, (3) compound nouns whose last component is itself an entry (a later phase can analyse them).
- [ ] Release `de`; DATA.md + NOTICE; commit.

### Task 2: German definition — script, tokenizer, segmenter, inventory, prepositions, eras

**Files:** `src/lang/de/{index,inventory,codes,normalize,tokenize,segment,prepositions}.js`; registry; i18n; `tests/lang/de.test.js`.

- `script.normalize`: NFC only; `daß`→`dass` (the one reform respelling common in old texts).
- `tokenize`: Latin-script words with umlauts/ß, hyphenated compounds whole; a **sentence-initial** word with a capital first letter gets `altKey` = its lower-case-first form (and vice versa never).
- `segment`: `.?!` with abbreviations (z. B., d. h., usw., bzw., Nr., S., Dr., Hr., Fr., ca., vgl.) and ordinals (`3. Oktober`) guarded.
- `inventory`: case on the hue in school order nom gen dat acc; number border; gender channel with names; families nominal [noun, adj, det, pron, num, ppl], verb [verb]; agreement targets [adj, det, pron, ppl], witnesses [noun, pron, det]; `codes`.
- eras: one, `modern` ('Present-day standard German'), IPA tags none (Wiktionary German IPA is untagged).
- `government: GOVERNMENT, phrase: true`.

- [ ] Failing tests: segment `Er kam am 3. Oktober, z. B. mit dem Zug. Gut!` → 2; tokenize `Essen ist gut.` first token key `Essen`, altKey `essen`, second no altKey; `daß` key `dass`; registry `/de/`.
- [ ] Implement; tests pass; commit.

### Task 3: Core — alternative keys

**Files:** `src/lib/state.js` (collect `altKey`), `src/lib/disambiguate.js` (`buildBlocks` unions `analysesByKey.get(token.key)` and `get(token.altKey)`); tests in `tests/state.test.js`, `tests/disambiguate.stage1.test.js`.

- [ ] Failing test: a token `{key:'Essen', altKey:'essen'}` with analyses for both gets both; Latin tokens (no altKey) unchanged. Implement; full suite; commit.

### Task 4: Core — government over the noun phrase

**Files:** `src/lib/disambiguate.js` `governmentStage(blocks, government, { phrase = false })`; German definition passes `phrase: true`; `src/app/lib/chunks.js` glues the preposition to every member of its governed span (links of kind `government` to the preposition).

Rule: with `phrase`, after a preposition the governed span is the following blocks while each has a det/adj/num/pron/ppl candidate, up to and including the first block with a noun candidate (max 5); every block of the span is filtered to the governed cases (never emptied); the preposition narrows when the span's surviving cases are one.

- [ ] Failing tests: `mit dem guten Wein` → dem, guten, Wein all dative and glued with mit as one chunk; `in das Haus` → accusative; `in dem Haus` → dative; `in Häuser` (gen/acc/nom pl, no article) → stays acc only? no: in + acc|dat ∩ {nom,gen,acc} = acc → accusative; `an die Wand` with `die` nom/acc and Wand nom/gen/dat/acc → acc; a Wechselpräposition whose span allows both acc and dat stays two-coloured. Latin's adjacency behaviour unchanged (existing tests).
- [ ] Implement; full suite; commit.

### Task 5: Article on noun pills

**Files:** `src/app/components/Block.svelte` (a `.article` line above a noun's surface: `der/die/das` from the candidates' gender when one, `die (Pl.)` for plural, both when ambiguous `der/das`), shown when `lang.inventory.showArticle`; legend row; i18n.

- [ ] Failing component test: Haus (n sg) → `das`; Häuser (pl) → `die (Pl.)`; a noun with m and n candidates → `der / das`; Latin pills never show it. Implement; commit.

### Task 6: Natural voice tier (Piper, Thorsten)

**Files:** `src/app/lib/voice.js` (`createVoice({ …, natural: { voiceId, sizeMB } })`: tier `natural` when `piper.stored()` lists the voice; `download(progress)`), `src/app/components/VoiceSettings.svelte` (in Dictionary settings: "Natural voice: Thorsten (63 MB) — Download / Remove", progress bar), i18n, NOTICE (Piper MIT, Thorsten CC0 per its model card), Help.

Loader: `import('https://cdn.jsdelivr.net/npm/@mintplex-labs/piper-tts-web@1.0.5/+esm')` only inside `download()`, `speak()` with tier natural, and `stored()` — and `stored()` is called only when the settings card is opened.

- [ ] Failing tests (fake piper module): tier `natural` when stored; download reports progress then tier natural; speak with natural calls `predict({ text, voiceId })` and plays the WAV; with no piper loaded the tiers are as before; the settings card with no click performs no import (spy on the loader).
- [ ] Implement; browser check: download Thorsten, hear `das Haus`; commit.

### Task 7: Samples, wrap, merge

- [ ] `public/samples/de/`: Wikipedia „Deutsche Sprache" (intro, CC BY-SA, attribution), Grimm „Rotkäppchen" opening (public domain, 1857 text, reform spelling applied and said so), Kafka „Die Verwandlung" first sentence (public domain, 1915).
- [ ] Headless check: `/de/` sample, article lines, `mit dem …` chunk, entry with IPA and speaker, bar.
- [ ] README, DATA, NOTICE, memory; final review (fresh reviewer); fix pass; merge; live check.
