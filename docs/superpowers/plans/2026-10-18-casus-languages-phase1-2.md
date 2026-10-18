# Casus Languages, Phase 1 (skeleton) and Phase 2 (Ancient Greek) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Turn the Latin page into a parameterised instance of a language definition, add the shared features every language gets (navigation bar, IPA, speaker, text-file upload, release-asset data), and ship Ancient Greek on it with its alphabet game.

**Architecture:** A language definition module (`src/lang/<code>/index.js`) supplies script, inventory, segmenter, tokenizer, cascade stages, arrange patterns, eras, samples path, data path and voice; `src/lib/state.js` and the page read it. Colours and the legend are generated from the inventory. Data per language lives in `data/<code>/` built offline (Latin from Whitaker as today; Greek from the Wiktextract extract), published as GitHub Release assets that the Pages workflow and a local script download. The path selects the language (`/` Latin, `/grc/` Greek, `/grc/game/` the alphabet drill).

**Tech Stack:** Svelte 5 + Vite 8 (existing), vitest + jsdom, Python 3.11 build pipeline with pytest, playwright headless check, GitHub Releases + Actions, `@echogarden/espeak-ng-emscripten` 0.3.5 (GPL-3.0, loaded from jsDelivr at runtime) for the voice fallback.

**Spec:** `docs/superpowers/specs/2026-10-18-casus-languages-design.md` (builds on `docs/superpowers/specs/2026-08-20-casus-design.md`).

## Global Constraints

- Open source and open data only; every data asset named in `NOTICE.md` with its licence; CC BY-SA files never blended with public-domain ones (spec §3): Latin's IPA is its own file `data/la/ipa.json`.
- Per language on disk: **≤ 60 MB raw, every shard ≤ 300 KB gzipped**, measured and written to `docs/DATA.md` (spec §3).
- Ambiguity shown, never guessed: a stage may never empty a candidate set (Latin spec §4.1); the legend and palette stay the validated six Okabe–Ito hues + neutral.
- **Latin looks and behaves exactly as today after phase 1**: `tools/ui_check.mjs` passes unchanged except for the data path, and the 246 JS / 92 Python tests keep passing (modified only where a signature changes).
- UI strings through `t()` in English and pt-BR, Brazilian forms only (existing test).
- Nothing heavy in the request path; espeak-ng and future models load on demand only.
- Node 20, npm 10.8 (`--legacy-peer-deps` when adding packages), Python 3.11+.

## Review Focus

1. A Greek text pasted in Unicode NFC with combining marks differently composed than Wiktionary's (NFD vs precomposed) must still look up — Task 10's parity fixture includes both compositions of ἀνήρ.
2. A Greek word with final sigma (λόγος) must hit the same key as its medial form (λόγοσ typed by mistake) — Task 10 test.
3. A sentence ending in the Greek question mark `;` must split there and never at a Greek middle dot used as a semicolon — Task 12 segment test.
4. Opening `/grc/` directly on GitHub Pages (deep link, cold load) must render the Greek page, not Latin's and not a 404 — Task 3's build copies `index.html` into `grc/`, and the headless check opens the deep link.
5. A browser with no `speechSynthesis` at all (older WebView) must show the speaker button working through espeak-ng, and one with neither network nor the WASM cached must show the button's "no voice" note, never a silent click — Task 7 tests both fakes.

---

## File Structure

```
src/lang/registry.js                 shipped languages in bar order: [{ code, name:{en,pt}, path }]
src/lang/la/index.js                 Latin definition (script, inventory, segment, tokenize, stages, arrange, eras, voice, data, samples)
src/lang/la/inventory.js             channels/values/badges/legend names for Latin
src/lang/grc/index.js, inventory.js, normalize.js, prepositions.js, game.js
src/lib/state.js                     createState({ text, lexicon, lang, saved })  — lang supplies segment/tokenize/stages
src/lib/disambiguate.js              runCascade(tokens, analysesByKey, { pins, stages }) — stages from lang; agreement/government parameterised
src/lib/normalize.js                 unchanged (Latin); grc has its own
src/lib/lexicon.js                   decodeAnalysis(code, lemma, codes) — code tables from lang.inventory.codes
src/app/lib/colors.js                makeColors(inventory) -> { blockStyle, LEGEND, CASE_COLORS… }; family() from inventory
src/app/lib/route.js                 langFromPath(pathname, base) -> { code, view: 'reader'|'game' }
src/app/lib/voice.js                 createVoice({ lang, synth, loadEspeak }) -> { available, speak(text), tier }
src/app/lib/upload.js                readTextFile(file) -> Promise<string>
src/app/components/LanguageBar.svelte, Speaker.svelte, Game.svelte
src/app/App.svelte                   reads route → lang; passes lang to reader, colours, bar
tools/fetch_data_assets.sh           downloads data-<code>-*.tar.gz from the latest release into data/<code>/
tools/release_data.sh <code>         packs data/<code>/ and uploads it as a release asset
tools/fetch_wiktextract.sh <Language>  downloads kaikki.org JSONL into vendor/wiktextract/
tools/casus_build/ipa.py             build_ipa(jsonl_lines, lemmas) -> {lemma_id: [{ipa, tags}]}
tools/casus_build/grc/normalize.py, parse.py, codes.py, prepositions.py
tools/build_lang.py grc              builds data/grc/ from vendor/wiktextract/kaikki.org-dictionary-AncientGreek.jsonl
docs/languages/grc.md                Ancient Greek grammar document (spec §5)
public/samples/<code>/index.json + texts, SOURCES.md
.github/workflows/pages.yml          + fetch_data_assets step; build copies index.html per language
```

---

### Task 1: Language registry and the Latin definition; `createState` takes a language

**Files:**
- Create: `src/lang/registry.js`, `src/lang/la/index.js`, `src/lang/la/inventory.js`
- Modify: `src/lib/state.js:11-30`, `src/lib/disambiguate.js:154-215`
- Test: `tests/lang/registry.test.js`, `tests/state.test.js` (existing, add two cases)

**Interfaces:**
- Produces: `LANGUAGES` (array of `{ code, name: { en, pt }, path }`, Latin first with `path: '/'`), `getLanguage(code) -> definition`.
- Produces: a language definition `{ code, bcp47, script: { normalize(s), rtl: boolean, spaced: boolean }, inventory, segment(text), tokenize(sentenceText), stages: Array<(blocks) => blocks>, government: Record<string, string[]>, arrange: string[], eras, dataPath: string, samplesPath: string, voice: { espeak: string } }`.
- Produces: `createState({ text, lexicon, lang, saved })`; `runCascade(tokens, analysesByKey, { pins, stages })`; `governmentStage(blocks, government)` and `agreementStage(blocks, inventory)` take their tables as arguments; `runCascade` without `stages` uses Latin's (so existing tests pass untouched).

- [ ] **Step 1: Write the failing tests**

```js
// tests/lang/registry.test.js
import { LANGUAGES, getLanguage } from '../../src/lang/registry.js';
it('lists Latin first at the root path, each language with both names', () => {
  expect(LANGUAGES[0]).toMatchObject({ code: 'la', path: '/', name: { en: 'Latin', pt: 'Latim' } });
});
it('a definition carries script, inventory, segment, tokenize, stages, government, arrange, eras, data and samples paths, voice', () => {
  const la = getLanguage('la');
  for (const k of ['script', 'inventory', 'segment', 'tokenize', 'stages', 'government', 'arrange', 'eras', 'dataPath', 'samplesPath', 'voice']) expect(la).toHaveProperty(k);
  expect(la.dataPath).toBe('/data/la'); expect(la.voice.espeak).toBe('la'); expect(la.stages).toHaveLength(3);
});
// tests/state.test.js — add
it('createState takes the language definition and uses its segment/tokenize/stages', async () => {
  const lang = { ...getLanguage('la'), segment: (t) => [{ text: t, start: 0, end: t.length }] };
  const s = createState({ text: 'Rosa. Bona.', lexicon, lang });
  expect(s.sentences()).toHaveLength(1);
});
```

- [ ] **Step 2: Run, verify they fail** — `npx vitest run tests/lang tests/state.test.js` → "Cannot find module registry.js".
- [ ] **Step 3: Implement** `src/lang/la/index.js` by importing the existing modules (`segment`, `tokenize`, `normalizeForm`, `GOVERNMENT`, `ERAS`, `WORD_ORDERS`) and the three stages from `disambiguate.js`; `src/lang/la/inventory.js` exports `{ primary: 'case', channels: { case: { values: ['nom','voc','gen','dat','acc','abl','loc'], badge: {...}, name: { en: {...}, pt: {...} } }, number: { values: ['sg','pl'] }, gender: {...}, verb: { tense: {...}, mood, voice, person } }, families: { nominal: ['noun','adj','pron','num','vpar','supine'], verb: ['verb'], function: '*' }, codes: <the format-2 tables copied from tools/casus_build/shard.py> }`. In `state.js` replace the imports with `lang.segment`, `lang.tokenize`, and pass `{ pins, stages: lang.stages }` to `runCascade`; `createState` throws `new Error('createState needs lang')` when `lang` is missing. In `disambiguate.js`, `governmentStage(blocks, government = GOVERNMENT)` and `agreementStage(blocks, inventory = LATIN_INVENTORY)`; `runCascade(..., { pins, stages = DEFAULT_STAGES })` runs the stages in order after pins.
- [ ] **Step 4: Run the whole suite** — `npx vitest run` → all pass (existing tests call `createState` without `lang` only through `createReader`; update `createReader` to pass `lang` with default `getLanguage('la')`).
- [ ] **Step 5: Commit** — `git commit -m "feat: language registry and Latin definition; the parser state takes a language"`.

### Task 2: Inventory-driven colours and legend

**Files:**
- Modify: `src/app/lib/colors.js` (whole), `src/app/components/Block.svelte`, `Legend.svelte`, `BlockPane.svelte`, `order.js` (family lookups)
- Test: `tests/ui/colors.test.js` (existing, keep every assertion), add `tests/ui/colors.inventory.test.js`

**Interfaces:**
- Produces: `makeColors(inventory) -> { COLORS: Record<value, hex>, blockStyle(block, layers), LEGEND, family(analysis), badge(analysis), describeAnalysis(a) }`. `src/app/lib/colors.js` keeps exporting Latin's `CASE_COLORS`, `blockStyle`, `LEGEND`… as `makeColors(LATIN_INVENTORY)` so nothing else changes in phase 1.
- Rule: the primary channel's values get the six hues in order; a 7th and later value shares the hue of the value its inventory names in `sharesHueOf` with border style `double`; secondary channels map to border style per `inventory.channels.<name>.border` (`{ pl: 'dashed' }`).

- [ ] **Step 1: Write the failing test**

```js
it('assigns the six validated hues to a five-case inventory in order and leaves the sixth unused', () => {
  const inv = { primary: 'case', channels: { case: { values: ['nom','gen','dat','acc','voc'], badge: { nom:'Nm', gen:'Gn', dat:'Dt', acc:'Ac', voc:'Vc' } }, number: { values: ['sg','du','pl'], border: { du: 'double', pl: 'dashed' } } }, families: { nominal: ['noun'], verb: ['verb'], function: '*' } };
  const c = makeColors(inv);
  expect(Object.keys(c.COLORS)).toEqual(['nom','gen','dat','acc','voc']);
  expect(new Set(Object.values(c.COLORS)).size).toBe(5);
  const s = c.blockStyle({ token:{index:0,surface:'x'}, candidates:[{ analysis:{ pos:'noun', case:'gen', number:'du' } }], pinned:null }, { nominal:true, verb:true, function:true });
  expect(s.borderStyle).toBe('double');
  expect(c.LEGEND.map((r) => r.key)).toContain('du');
});
```

- [ ] **Step 2: Run, verify it fails.** `npx vitest run tests/ui/colors.inventory.test.js`
- [ ] **Step 3: Implement `makeColors`**; the Latin inventory's `sharesHueOf: { loc: 'abl' }` and `border: { pl: 'dashed' }`, `locBorder: 'double'` reproduce today's values exactly (the existing `colors.test.js` is the oracle).
- [ ] **Step 4: Run the whole suite** — pass, including `legend.test.js`.
- [ ] **Step 5: Commit** — `"feat: colours and legend generated from the language inventory"`.

### Task 3: Routing, the language bar, per-language data and sample paths

**Files:**
- Create: `src/app/lib/route.js`, `src/app/components/LanguageBar.svelte`
- Modify: `src/app/App.svelte`, `vite.config.js` (copy `index.html` into `dist/<code>/` and `dist/<code>/game/` for every registry entry at `closeBundle`), `public/samples/` → `public/samples/la/` (move the three Latin files + `SOURCES.md`, `index.json`), `src/app/lib/persist.js` (key `casus:<code>:<hash>`), `tools/ui_check.mjs` (paths)
- Test: `tests/ui/route.test.js`, `tests/components/app.test.js` (bar present; Latin at `/`)

**Interfaces:**
- Produces: `langFromPath(pathname, base) -> { code, view }`; `/` → `{ code:'la', view:'reader' }`, `/casus/grc/game/` with base `/casus/` → `{ code:'grc', view:'game' }`, unknown → `la`.
- App reads `lang = getLanguage(route.code)`, uses `lang.dataPath` and `lang.samplesPath` through `withBase`, passes `lang` to `createReader` and the colour functions; `LanguageBar` lists `LANGUAGES` with the current one marked, links through `withBase(l.path)`, plus a "letters" link to `/<code>/game/` when `lang.game` exists.

- [ ] **Step 1: Write the failing tests** (`route.test.js` with the three cases above; `app.test.js`: `expect(container.querySelector('nav.languages a[aria-current=page]').textContent).toMatch(/Latin/)`).
- [ ] **Step 2: Run, verify they fail.**
- [ ] **Step 3: Implement.** Persist key: `casus:${lang.code}:${textHash(text)}`; migration: on load, if `casus:${hash}` exists and the code is `la`, read it (one line) so today's saved arrangements survive.
- [ ] **Step 4: Run suite + headless check** — `node tools/ui_check.mjs` against the dev server passes with `/data/la`; `npm run build` leaves `dist/la/` absent (Latin is `/`) and the plugin writes nothing else yet (registry has Latin only).
- [ ] **Step 5: Commit** — `"feat: route by path, language bar, data and samples per language"`.

### Task 4: Data as release assets

**Files:**
- Create: `tools/fetch_data_assets.sh`, `tools/release_data.sh`
- Modify: `.gitignore` (`data/` ignored again), `.github/workflows/pages.yml`, `README.md` (Development section), `docs/DATA.md` (where data lives)
- Move: `data/*` → `data/la/*` (`git mv` then `git rm -r --cached data`)

**Interfaces:**
- `tools/release_data.sh <code>` packs `data/<code>/` into `data-<code>-$(date +%F).tar.gz` and runs `gh release upload data --clobber` on a release tagged `data` (created once with `gh release create data --title "Data assets" --notes ...`); `tools/fetch_data_assets.sh [code…]` downloads every `data-<code>-*.tar.gz` of the `data` release (latest per code) and extracts into `data/<code>/`.
- Workflow: after checkout, `gh release download data --pattern 'data-*.tar.gz'` then extract, with `GH_TOKEN: ${{ github.token }}`.

- [ ] **Step 1: Write the check** — a bash test `tools/tests/test_fetch_assets.sh` that runs `fetch_data_assets.sh la` into a temp dir with `GH_REPO` pointing at the real release and asserts `data/la/manifest.json` exists. Run: fails (no release yet).
- [ ] **Step 2: Implement scripts; create the `data` release; upload Latin** (`bash tools/release_data.sh la`).
- [ ] **Step 3: Run the check** → passes. `git rm -r --cached data && git commit`; push; the Pages run must be green and https://allan-valin.github.io/casus/data/la/manifest.json 200.
- [ ] **Step 4: Commit** — `"build: data lives in release assets; the workflow and a script download it"`.

### Task 5: Text-file upload

**Files:**
- Create: `src/app/lib/upload.js`; Modify: `src/app/components/PassagePicker.svelte`, `src/app/lib/i18n.svelte.js` (`picker.upload`, `picker.upload.title`, `act.uploaded`)
- Test: `tests/ui/upload.test.js`, `tests/components/toolbar.test.js`

**Interfaces:** `readTextFile(file) -> Promise<string>` (UTF-8 via `file.text()`, BOM stripped, `\r\n` normalised); picker emits `onchoose(text, null)` with the file's text.

- [ ] **Step 1: Write the failing tests** — `readTextFile(new File(['﻿Rosa.\r\nBona.'], 'a.txt'))` resolves `'Rosa.\nBona.'`; the picker has `input[type=file][accept=".txt,.md,text/plain,text/markdown"]` and a change event with a File calls `onchoose('Rosa bona.', null)`.
- [ ] **Step 2: Run, fail. Step 3: Implement. Step 4: Pass. Step 5: Commit** — `"feat: upload a .txt or .md file as the text"`.

### Task 6: IPA for Latin from the Wiktextract Latin extract

**Files:**
- Create: `tools/fetch_wiktextract.sh`, `tools/casus_build/ipa.py`, `tools/tests/test_ipa.py`, `tools/build_ipa.py`
- Modify: `src/app/lib/fetchers.js` (`loadIpa`), `src/app/stores/reader.svelte.js` (`lexiconExtras.ipa`), `src/app/components/Dictionary.svelte` (IPA line under the form), `NOTICE.md`, `docs/DATA.md`
- Test: `tests/components/dictionary.test.js`

**Interfaces:**
- `build_ipa(jsonl_lines, lemmas) -> dict[str, list[dict]]` keyed by lemma id, each `{ "ipa": "[ˈrɔ.sa]", "tags": ["Classical-Latin"] }`, joined on normalised headword + pos like `glosses.py`; `data/la/ipa.json`.
- Dictionary shows the IPA whose tags match the period (`classical` → `Classical-Latin`; `late`/`medieval`/`neo` → `Ecclesiastical`), else the first; a title names the variant.

- [ ] **Step 1: Write the failing tests** — Python: two sounds on `rosa`, `build_ipa` keeps both with tags, drops entries without `ipa`, keys by lemma id; JS: with `extras.ipa = { 7: [{ ipa:'[ˈrɔ.sa]', tags:['Classical-Latin'] }, { ipa:'[ˈrɔː.za]', tags:['Ecclesiastical'] }] }` and era `classical`, `.ipa` text is `[ˈrɔ.sa]`; era `medieval` → `[ˈrɔː.za]`.
- [ ] **Step 2: Fail. Step 3: Implement**; `bash tools/fetch_wiktextract.sh Latin` (≈1.5 GB, once, into `vendor/wiktextract/`); `python3 tools/build_ipa.py la` writes `data/la/ipa.json` and prints coverage; record it in `docs/DATA.md`; NOTICE: CC BY-SA, separate file.
- [ ] **Step 4: Pass; `bash tools/release_data.sh la`. Step 5: Commit** — `"feat: IPA in the entry, Latin's from Wiktionary (own CC BY-SA file)"`.

### Task 7: The speaker button with voice tiers

**Files:**
- Create: `src/app/lib/voice.js`, `src/app/components/Speaker.svelte`; Modify: `Dictionary.svelte`, `i18n.svelte.js` (`voice.speak`, `voice.none`, `voice.loading`, `voice.tier.browser`, `voice.tier.espeak`), `Help.svelte` (espeak-ng, GPL-3.0, loaded from jsDelivr), `NOTICE.md`
- Test: `tests/ui/voice.test.js`, `tests/components/dictionary.test.js`

**Interfaces:**
- `createVoice({ bcp47, espeakVoice, synth = globalThis.speechSynthesis, loadEspeak = defaultLoader }) -> { tier(): Promise<'browser'|'espeak'|null>, speak(text): Promise<void> }`. `tier()` resolves `'browser'` when `synth.getVoices()` has a voice whose `lang` starts with `bcp47`; else tries `loadEspeak()` (dynamic `import('https://cdn.jsdelivr.net/npm/@echogarden/espeak-ng-emscripten@0.3.5/espeak-ng.js')`, synthesises to PCM and plays through `AudioContext`), `'espeak'` on success; `null` if that import rejects.
- `Speaker.svelte` props `{ text, voice }`: a 🔊 button; label from the tier; disabled with `t('voice.none')` title when `null`; logs `act.spoke` through `onaction`.

- [ ] **Step 1: Write the failing tests** — fake `synth` with a `la-x` voice → `'browser'` and `speak` calls `synth.speak` once with an utterance whose `.lang` is `'la'`; no voices + `loadEspeak` resolving a fake `{ synthesize: vi.fn(async () => ({ sampleRate: 22050, audio: new Float32Array(10) })) }` → `'espeak'`; no voices + `loadEspeak` rejecting → `null` and the button disabled with the "no voice" title.
- [ ] **Step 2: Fail. Step 3: Implement. Step 4: Pass; by hand in the dev server click 🔊 on `Gallia` and hear it (record which tier in the log line). Step 5: Commit** — `"feat: speaker button — browser voice, else espeak-ng in the page"`.

### Task 8: Phase-1 wrap: headless check, docs, Latin as before

- [ ] **Step 1:** `tools/ui_check.mjs`: open `/`, assert the bar marks Latin, open the deep link `/grc/` → still Latin (unknown → `la`) with no error; upload a file through `setInputFiles`; click 🔊 and assert the log line names a tier. Run → pass.
- [ ] **Step 2:** README "The page" + Development updated (release assets, Wiktextract fetch, IPA, voice, upload); `docs/FEEDBACK-2026-10-18.md` status line.
- [ ] **Step 3: Commit, push, Pages green, live page checked by hand.** `"docs: phase 1 of the languages plan — Latin on the generalised skeleton"`.

---

### Task 9: The Ancient Greek grammar document

**Files:** Create `docs/languages/grc.md`.

- [ ] **Step 1: Write it** from the reference grammars (Smyth, *Greek Grammar*; Goodwin; the Wiktionary category tags): the five cases (nominative, genitive, dative, accusative, vocative) with their Greek names (ὀνομαστική, γενική, δοτική, αἰτιατική, κλητική), three numbers incl. dual, three genders, the article as agreement witness, the verb system (tenses present/imperfect/future/aorist/perfect/pluperfect/future-perfect; moods indicative/subjunctive/optative/imperative/infinitive/participle; voices active/middle/passive/mediopassive), the prepositions by governed case(s) (ἐν+dat; εἰς+acc; ἐκ/ἐξ+gen; ἀπό+gen; πρός+gen/dat/acc; παρά+gen/dat/acc; ἐπί+gen/dat/acc; περί+gen/dat/acc; ὑπό+gen/dat/acc; κατά+gen/acc; μετά+gen/acc; διά+gen/acc; ὑπέρ+gen/acc; ἀνά+acc; σύν+dat; ἀντί+gen; πρό+gen; ἀμφί+gen/dat/acc), elision and crasis, enclitics (τε, γε, με, σε, τις, ποτε, ἐστί…), the periods for the era control (Homeric/Archaic, Classical Attic, Koine, Byzantine/Medieval, Modern), sentence punctuation (`.` `;` question, `·` colon), and the IPA variants Wiktionary carries (5th BC Attic, 1st BC Egyptian, 4th AD Koine, 10th AD Byzantine, 15th AD Constantinopolitan). Each item: term in Greek, English, Portuguese; whether the lexicon supplies it, agreement, or government; the badge proposed.
- [ ] **Step 2: Commit** — `"docs: Ancient Greek grammar for the inventory"`.

### Task 10: Greek normalisation, shared by both languages

**Files:** Create `tools/casus_build/grc/normalize.py`, `src/lang/grc/normalize.js`, `tests/fixtures/normalization.grc.json`; Test: `tools/tests/test_grc_normalize.py`, `tests/lang/grc.normalize.test.js`.

**Interfaces:** `normalize_grc(s) -> str` / `normalizeGrc(s) -> string`: NFD → lowercase → final sigma `ς → σ` → remove the macron/breve/dieresis-for-length marks (U+0304, U+0306) → **keep** breathings, accents and iota subscript (they distinguish words: ἡ/ἥ/ἤ) → NFC. Same fixture in both languages, 12 pairs including `ἀνήρ` precomposed and decomposed → identical output, `λόγος`/`λόγοσ` → `λόγοσ`, `ᾍδης` → `ᾅδησ`, `Ἀθῆναι` → `ἀθῆναι`.

- [ ] **Step 1: fixture + both failing tests. Step 2: fail. Step 3: implement both. Step 4: pass. Step 5: commit** — `"feat: Greek normalisation with cross-language parity fixture"`.

### Task 11: The Greek build from the Wiktextract extract, and the size gate

**Files:**
- Create: `tools/casus_build/grc/parse.py` (`parse_entries(jsonl_lines) -> Iterator[Entry]`), `tools/casus_build/grc/codes.py` (`encode_analysis`, `decode_analysis`, `_LAYOUT` for Greek channels), `tools/casus_build/grc/prepositions.py` (table from Task 9 → `data/grc/government.json`), `tools/build_lang.py`, `tools/tests/test_grc_parse.py`, `test_grc_codes.py`, `tools/tests/fixtures/grc_sample.jsonl` (20 real lines: λόγος, ἀνήρ, λύω, ὁ, ἐν, καλός, πόλις, εἰμί)
- Modify: `tools/casus_build/shard.py` (`write_assets(index, lemmas, out_dir, codes=LATIN)` — the code tables injected), `docs/DATA.md`, `NOTICE.md`

**Interfaces:**
- `Entry = { id: int (line index), headword, pos, gender, decl_class (from head_templates args / sense tags 'declension-2'), gloss_en: '; '.join(first gloss of each sense), ipa: [{ipa, tags}], forms: [{ form, tags }] }`; only `lang_code == 'grc'`, pos in `{noun, adj, verb, det, pron, num, prep, conj, adv, particle, intj}`; forms with `source == 'declension'|'conjugation'` and real tags (skip `table-tags`, `inflection-template`, `romanization`).
- Analysis dict per form from tags: nominal `{ pos, case, number, gender, degree }` with `case ∈ nom voc gen dat acc`, `number ∈ sg du pl`, `gender ∈ m f n`; verb `{ pos:'verb', person, number, tense ∈ pres impf fut aor perf plup futp, mood ∈ ind sub opt imp inf ppl, voice ∈ act mid pass mp }`; a participle form is `pos:'vpar'` with case/number/gender + tense/voice.
- Greek codes: one letter per channel as Latin's, documented in `codes.py` and mirrored in `src/lang/grc/inventory.js` (`codes`), and `decodeAnalysis(code, lemma, codes)` in `lexicon.js` takes the table.
- `python3 tools/build_lang.py grc` writes `data/grc/{manifest.json, forms/, lemmas.json, glosses.en.json, ipa.json, government.json}`; prints forms, analyses, lemma count, bytes, largest shards, and the gate verdict.

- [ ] **Step 1: Write the failing tests** — from the fixture: `λόγος` yields an Entry with gender `m`, `decl_class` `2`, 20 forms incl. `λόγου` → `{case:'gen', number:'sg'}`, and ipa with 5 variants; `λύω` yields `λύομεν` → `{person:'1', number:'pl', tense:'pres', mood:'ind', voice:'act'}`; `ὁ` → pos `det` with `τοῦ` gen sg m/n (two analyses); `encode/decode` round-trip for 6 analyses; `shard_key` works on Greek letters (two-letter prefixes in NFC).
- [ ] **Step 2: Fail. Step 3: Implement**; `bash tools/fetch_wiktextract.sh "Ancient Greek"` (385 MB); run the build and **measure**. If over 60 MB raw: first drop lemmas with no gloss, then forms whose only lemma has frequency unknown and tags `rare`/`poetic`; record each cut and the numbers in `docs/DATA.md`; never drop the dual.
- [ ] **Step 4: Tests pass; gate recorded. `bash tools/release_data.sh grc`. Step 5: Commit** — `"feat: Ancient Greek index built from Wiktextract; size gate measured"`.

### Task 12: The Greek language definition

**Files:** Create `src/lang/grc/index.js`, `inventory.js`, `segment.js`, `tokenize.js`, `prepositions.js` (loads `government.json`), `eras.js`; `public/samples/grc/{index.json, homer-il-1.txt, xenophon-an-1-1.txt, john-1.txt, SOURCES.md}`; Modify `src/lang/registry.js` (add grc), `src/lib/disambiguate.js` (agreement also accepts `det` as witness; dual in `agrees`), `i18n.svelte.js` (Greek era labels/authors, legend names for `du`, `voc`…). Test: `tests/lang/grc.test.js`, `tests/components/app.grc.test.js`.

**Interfaces:** as Task 1's definition shape; `segment`: ends at `.` `;` `!` `?`, never at `·`, abbreviation-free; `tokenize`: splits on whitespace and punctuation, keeps elided words with the apostrophe (`δ’` → key `δ’` looked up as-is, and as `δέ` through an `ELISIONS` map of the 40 common ones), crasis left whole; `arrange`: `['SVO','SOV','VSO','VOS','OVS','OSV']`; eras `['homeric','classical','koine','byzantine','modern']` with IPA tag matching (`classical` → `5th BCE Attic`…).

Marks (spec §7, added 2026-10-18): `lang.script.marks = { strip(s) -> string, hasMarks(s) -> boolean }`; when a token has no marks (`hasMarks(surface) === false`) and the lexicon hit came through the stripped key, the pill shows the lexicon's marked form in a `.reading` line above the surface (class `supplied`), and the text pane shows it as a ruby; toggle `reader.layers.marks` (default on). The Greek lexicon is therefore also indexed by the **stripped** key: `build_lang.py` writes a second key per form when stripping changes it (counted in the gate).

- [ ] **Step 1: Write the failing tests** — `hasMarks('λογος')` false, `hasMarks('λόγος')` true, `strip('ἀνήρ')` → `'ανηρ'`; a block whose surface is `λογος` and whose candidates came from `λόγος` renders `.reading.supplied` with text `λόγος`, and none when the surface already carries marks; `segment('ἐν ἀρχῇ ἦν ὁ λόγος· καὶ ὁ λόγος ἦν πρὸς τὸν θεόν. τίς εἶ;')` → 2 sentences; `tokenize("ἀλλ’ ἐγώ")` → keys `['ἀλλά' or 'ἀλλ’', 'ἐγώ']` (both keys requested); App test with a fake grc lexicon and `window.history.pushState({}, '', '/grc/')`: the bar marks Greek, `select.era option[value=koine]` present, a resolved genitive block has `CASE_COLORS.gen` of the Greek palette and badge `Gn`, a dual block has `borderStyle 'double'`; the article `ὁ` as witness narrows `λόγος` to nominative (agreement reason names `ὁ`).
- [ ] **Step 2: Fail. Step 3: Implement. Step 4: Pass; `npm run build` now writes `dist/grc/index.html` and `dist/grc/game/index.html`. Step 5: Commit** — `"feat: Ancient Greek on the page"`.

### Task 13: The Greek alphabet game

**Files:** Create `src/lang/grc/game.js` (`LETTERS`: 24 letters, lower/upper, name, romanisation, sound hint; `createGame({ rows, mode, random }) -> { current(), answer(text) -> { correct, expected }, score, streak, next() }`), `src/app/components/Game.svelte`; Modify `App.svelte` (route `view === 'game'`), `i18n.svelte.js` (`game.*`). Test: `tests/lang/grc.game.test.js`, `tests/components/game.test.js`.

**Interfaces:** rows = letter groups (α–ε, ζ–κ, λ–ο, π–τ, υ–ω; accented vowels; breathings) chosen by checkboxes; modes `letter→name` and `letter→sound`; a wrong letter is scheduled again within the next 3 draws (`weak` set); the speaker (Task 7) says the letter name.

- [ ] **Step 1: Failing tests** — `createGame({ rows:['α-ε'], mode:'name', random: () => 0 })` draws `α`, `answer('alpha')` → `{ correct: true }`, `answer('beta')` on `β` wrong → `β` appears again within 3 `next()` calls; component shows a letter, an input, a score `0/1` after one answer, and the row checkboxes.
- [ ] **Step 2: Fail. Step 3: Implement. Step 4: Pass; headless: open `/grc/game/`, answer twice, assert the score text. Step 5: Commit** — `"feat: Greek alphabet drill"`.

### Task 14: Phase-2 wrap

- [ ] **Step 1:** `tools/ui_check.mjs` drives `/grc/` with the John sample: pills, a chunk (`ἐν ἀρχῇ`), dictionary with IPA line and 🔊, pin, drag, reload, language bar switch to Latin and back.
- [ ] **Step 2:** README (Greek section, data per language), `docs/DATA.md` numbers, `NOTICE.md` (Wiktionary extract: CC BY-SA, extraction date), `docs/FEEDBACK-2026-10-18.md` status, memory.
- [ ] **Step 3: Commit, push; Pages green; https://allan-valin.github.io/casus/grc/ opened by hand.**

---

## Self-Review

**Spec coverage.** §4 language definition → Tasks 1–3, 12. §6 entry: IPA → 6, speaker → 7, Wiktionary link → *gap*: add to Task 6 Step 3: the entry's form line links to `https://en.wiktionary.org/wiki/<headword>#<Language>` (`lang.wiktionary = 'Latin' | 'Ancient_Greek'`) and, when `ui.lang === 'pt'`, a second link to `pt.wiktionary.org`; test: `a.wiktionary[href$="#Latin"]` exists. §7 game → 13; furigana, RTL, segmentation without spaces → later phases by design. §10 phase 1 and 2 → all tasks. §11 calls: release assets → 4; espeak tier → 7; samples CC → 12 (Homer, Xenophon, John: public-domain Perseus/SBLGNT-free text, `SOURCES.md`). Upload (approval addendum) → 5. §5 grammar document → 9.

**Step scan.** Task 11 "frequency unknown" — the extract has no frequency; the trim order is therefore: no-gloss lemmas, then entries tagged `rare`/`poetic`/`obsolete` in sense tags, then dialectal forms (`Epic`, `Doric`, `Aeolic` tags) keeping Attic and Koine; written into Task 11 Step 3 as that order.

**Type consistency.** `createState({ text, lexicon, lang, saved })` (1) ← `createReader` passes `lang` (3); `makeColors(inventory)` (2) ← Block/Legend/BlockPane receive `colors` from App via a context or prop (2 decides: a Svelte context `setContext('colors', makeColors(lang.inventory))` in App, `getContext('colors')` in the three components); `decodeAnalysis(code, lemma, codes)` (11) ← `createLexicon({ fetchShard, manifest, codes })` so the Greek lexicon decodes with its table (add to Task 12's definition: `lang.inventory.codes`). `createVoice` (7) ← Speaker; `lang.voice.espeak` (1). `langFromPath` (3) ← App.

**Review Focus** lines pinned: 1, 2 → Task 10 fixture; 3 → Task 12 segment test; 4 → Task 3 build copy + Task 14 deep link; 5 → Task 7 fakes.

**Proportion.** 14 tasks, signatures and assertions, no bodies; shorter than the two specs together.
