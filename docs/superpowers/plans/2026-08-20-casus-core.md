# Casus Core (Data Pipeline + Parser) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the offline morphology index and the pure, DOM-free parser modules, ending in a CLI that takes a Latin sentence and prints each word's surviving case candidates with the reason each survived.

**Architecture:** A Python offline build expands Whitaker's WORDS data into a sharded `form → [analysis]` index plus lemma metadata and gloss files. Five framework-free ES modules consume those assets at runtime: segment, tokenize, lexicon, disambiguate, state. The disambiguation cascade narrows candidate sets in three stages and may never empty one. No UI code in this plan.

**Tech Stack:** Python 3.11+ with pytest for the build; Node 20+ with vitest for the runtime modules; no runtime dependencies in the parser core.

**Spec:** `docs/superpowers/specs/2026-08-20-casus-design.md` — read it before starting. This plan implements §4, §5.1, §5.2 and §10.1 of that spec.

## Global Constraints

- **Open source only.** Every dependency and data source must be public domain, MIT, Apache-2.0, BSD or CC BY-SA. No commercial or proprietary dependency, ever.
- **The cascade may never empty a candidate set.** If a narrowing stage would remove the last candidate, the stage's result is discarded and the previous set stands. This is the project's central invariant and every stage must be tested for it.
- **The cascade may never drop the true reading.** Fixture tests assert the expected analysis survives.
- **Parser modules are DOM-free.** `src/lib/*.js` may not import Svelte, touch `window`, `document`, or `fetch` directly. Injection only.
- **Normalisation must be identical** in Python and JS: `j→i`, `v→u`, macrons stripped, lowercased. A shared fixture enforces parity.
- **No network at runtime.** All data is fetched from same-origin static assets.
- **TDD.** Test first, watch it fail, implement minimally, watch it pass, commit.
- **Node 20+, Python 3.11+.**

---

### Task 1: Repo scaffold and both test harnesses

**Files:**
- Create: `package.json`, `vite.config.js`, `.gitignore`, `pyproject.toml`, `README.md`
- Test: `tests/smoke.test.js`, `tools/tests/test_smoke.py`

**Interfaces:**
- Consumes: nothing.
- Produces: `npm test` runs vitest over `tests/`; `pytest` runs over `tools/tests/`.

- [ ] **Step 1: Write both failing smoke tests**

`tests/smoke.test.js`:
```js
import { describe, it, expect } from 'vitest';
import { version } from '../src/lib/version.js';

describe('smoke', () => {
  it('exposes a version string', () => {
    expect(version).toBe('0.1.0');
  });
});
```

`tools/tests/test_smoke.py`:
```python
from casus_build import VERSION


def test_version():
    assert VERSION == "0.1.0"
```

- [ ] **Step 2: Run both, verify they fail**

Run: `npx vitest run` — expected: FAIL, cannot resolve `../src/lib/version.js`.
Run: `python -m pytest tools/tests -q` — expected: FAIL, `ModuleNotFoundError: casus_build`.

- [ ] **Step 3: Create the scaffold**

`package.json`:
```json
{
  "name": "casus",
  "private": true,
  "type": "module",
  "scripts": {
    "test": "vitest run",
    "test:watch": "vitest"
  },
  "devDependencies": {
    "vitest": "^2.1.0"
  }
}
```

`pyproject.toml`:
```toml
[project]
name = "casus-build"
version = "0.1.0"
requires-python = ">=3.11"

[tool.setuptools]
packages = ["casus_build"]
package-dir = {"" = "tools"}

[tool.pytest.ini_options]
pythonpath = ["tools"]
```

`src/lib/version.js`:
```js
export const version = '0.1.0';
```

`tools/casus_build/__init__.py`:
```python
VERSION = "0.1.0"
```

`.gitignore`:
```
node_modules/
vendor/
__pycache__/
.pytest_cache/
*.pyc
dist/
```

`README.md` states: what Casus is (one paragraph, lifted from the spec's §1), how to run `npm test` and `pytest`, and that `vendor/` holds downloaded source data and is not committed.

- [ ] **Step 4: Run both, verify they pass**

Run: `npm install && npx vitest run` — expected: 1 passed.
Run: `python -m pytest tools/tests -q` — expected: 1 passed.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "chore: scaffold repo with vitest and pytest harnesses"
```

---

### Task 2: Fetch source data and capture real fixtures

Whitaker's WORDS is public domain. The canonical machine-readable mirror is the `mk270/whitakers-words` repository; the two files needed are `DICTLINE.GEN` (lemma entries) and `INFLECTS.LAT` (inflection rules).

**Do not invent the file formats.** Both are fixed-width-ish text with documented codes. This task's whole purpose is to look at the real bytes and commit small excerpts as test fixtures, so every later parser task tests against reality rather than assumption.

**Files:**
- Create: `tools/fetch_data.sh`, `NOTICE.md`, `tools/tests/fixtures/dictline_sample.txt`, `tools/tests/fixtures/inflects_sample.txt`, `docs/DATA.md`
- Test: `tools/tests/test_fixtures.py`

**Interfaces:**
- Consumes: nothing.
- Produces: `vendor/whitakers-words/DICTLINE.GEN` and `INFLECTS.LAT` on disk (gitignored); committed fixture excerpts; `docs/DATA.md` describing each field position, derived from the real file and the upstream documentation.

- [ ] **Step 1: Write `tools/fetch_data.sh`**

```bash
#!/usr/bin/env bash
# Downloads Whitaker's WORDS data (public domain) into vendor/.
set -euo pipefail
DEST="$(dirname "$0")/../vendor/whitakers-words"
BASE="https://raw.githubusercontent.com/mk270/whitakers-words/master/src/data"
mkdir -p "$DEST"
for f in DICTLINE.GEN INFLECTS.LAT; do
  echo "fetching $f"
  curl -fsSL "$BASE/$f" -o "$DEST/$f"
done
wc -l "$DEST"/*
```

Run: `bash tools/fetch_data.sh`

If the upstream path has moved, find the current location of the two files in that repository before continuing — do not substitute a different data source without checking its licence.

- [ ] **Step 2: Inspect the real data and record the format**

```bash
head -5 vendor/whitakers-words/DICTLINE.GEN
head -5 vendor/whitakers-words/INFLECTS.LAT
grep -c . vendor/whitakers-words/DICTLINE.GEN
```

Read the upstream documentation for the field layout. Write `docs/DATA.md` recording, for each file: the meaning and column span of every field used, the code vocabularies (part of speech, declension, gender, case, number, age, frequency), and the date and upstream commit the files were fetched from. This document is what makes the parser tasks reviewable.

- [ ] **Step 3: Capture fixtures**

Save roughly 40 lines of each file as the fixtures, chosen to cover variety rather than the first N lines:

```bash
grep -E '^(rosa|servus|urb|magn|capi|amo|reg) ' vendor/whitakers-words/DICTLINE.GEN | head -40 \
  > tools/tests/fixtures/dictline_sample.txt
head -40 vendor/whitakers-words/INFLECTS.LAT > tools/tests/fixtures/inflects_sample.txt
```

Adjust the grep until the sample contains, at minimum: a 1st-declension feminine noun, a 2nd-declension masculine noun, a 3rd-declension noun, an adjective, a 1st-conjugation verb and a 3rd-conjugation `-iō` verb. Verify by eye and note in `docs/DATA.md` which line covers which case.

- [ ] **Step 4: Write the failing fixture test**

`tools/tests/test_fixtures.py`:
```python
from pathlib import Path

FIXTURES = Path(__file__).parent / "fixtures"


def test_dictline_sample_present_and_varied():
    lines = (FIXTURES / "dictline_sample.txt").read_text(encoding="latin-1").splitlines()
    assert len(lines) >= 20, "fixture too small to cover the declensions"
    assert any("rosa" in line for line in lines), "expected a 1st-declension noun"


def test_inflects_sample_present():
    lines = (FIXTURES / "inflects_sample.txt").read_text(encoding="latin-1").splitlines()
    assert len(lines) >= 20
```

Run: `python -m pytest tools/tests/test_fixtures.py -q` — it fails if the fixtures are missing or too small, passes once Step 3 is done properly.

- [ ] **Step 5: Write `NOTICE.md`**

Record: Whitaker's WORDS is public domain, fetched from `mk270/whitakers-words` on the fetch date; the app's own code licence; and a placeholder section headed "Portuguese glosses (CC BY-SA)" to be filled by Task 8. State plainly that `vendor/` contents are not redistributed by this repo, only derived index files are.

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "feat: fetch script, data format notes and real test fixtures"
```

---

### Task 3: Normalisation, shared by both languages

Lookup keys must match between the Python build and the JS runtime, or every lookup silently misses. One fixture file governs both.

**Files:**
- Create: `tools/casus_build/normalize.py`, `src/lib/normalize.js`, `tests/fixtures/normalization.json`
- Test: `tools/tests/test_normalize.py`, `tests/normalize.test.js`

**Interfaces:**
- Consumes: nothing.
- Produces: `normalize_form(s: str) -> str` in Python; `normalizeForm(s: string): string` in JS. Both lowercase, map `j→i` and `v→u`, and strip combining macrons and breves. Both are used everywhere a lookup key is built.

- [ ] **Step 1: Write the shared fixture**

`tests/fixtures/normalization.json`:
```json
[
  { "input": "Rosa",      "expected": "rosa" },
  { "input": "rosā",      "expected": "rosa" },
  { "input": "Iulius",    "expected": "iulius" },
  { "input": "Julius",    "expected": "iulius" },
  { "input": "vita",      "expected": "uita" },
  { "input": "uīta",      "expected": "uita" },
  { "input": "VRBEM",     "expected": "urbem" },
  { "input": "cŏnsul",    "expected": "consul" },
  { "input": "",          "expected": "" }
]
```

- [ ] **Step 2: Write both failing tests**

`tools/tests/test_normalize.py`:
```python
import json
from pathlib import Path

import pytest

from casus_build.normalize import normalize_form

CASES = json.loads(
    (Path(__file__).parents[2] / "tests" / "fixtures" / "normalization.json").read_text()
)


@pytest.mark.parametrize("case", CASES, ids=lambda c: c["input"] or "empty")
def test_normalize(case):
    assert normalize_form(case["input"]) == case["expected"]
```

`tests/normalize.test.js`:
```js
import { describe, it, expect } from 'vitest';
import cases from './fixtures/normalization.json' with { type: 'json' };
import { normalizeForm } from '../src/lib/normalize.js';

describe('normalizeForm', () => {
  for (const { input, expected } of cases) {
    it(`normalizes "${input}"`, () => {
      expect(normalizeForm(input)).toBe(expected);
    });
  }
});
```

- [ ] **Step 3: Run both, verify they fail**

Run: `python -m pytest tools/tests/test_normalize.py -q` — expected: ModuleNotFoundError.
Run: `npx vitest run tests/normalize.test.js` — expected: cannot resolve `normalize.js`.

- [ ] **Step 4: Implement both**

`tools/casus_build/normalize.py`:
```python
import unicodedata

_LETTER_MAP = str.maketrans({"j": "i", "v": "u"})


def normalize_form(s: str) -> str:
    """Lowercase, strip diacritics, fold j->i and v->u. Lookup keys only."""
    decomposed = unicodedata.normalize("NFD", s.lower())
    stripped = "".join(ch for ch in decomposed if not unicodedata.combining(ch))
    return stripped.translate(_LETTER_MAP)
```

`src/lib/normalize.js`:
```js
/** Lowercase, strip diacritics, fold j->i and v->u. Lookup keys only. */
export function normalizeForm(s) {
  return s
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .replaceAll('j', 'i')
    .replaceAll('v', 'u');
}
```

- [ ] **Step 5: Run both, verify they pass**

Both suites green. If one passes and the other fails on the same case, fix the implementation — never the fixture.

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "feat: shared normalisation with cross-language parity fixture"
```

---

### Task 4: Parse DICTLINE into lemma records

**Files:**
- Create: `tools/casus_build/dictline.py`
- Test: `tools/tests/test_dictline.py`

**Interfaces:**
- Consumes: `tools/tests/fixtures/dictline_sample.txt`, `docs/DATA.md` field layout.
- Produces:
  ```python
  @dataclass(frozen=True)
  class Lemma:
      id: str          # stable: f"{stems[0]}:{pos}:{index}"
      stems: tuple[str, ...]
      pos: str         # "noun" | "adj" | "verb" | "pron" | "adv" | "prep" | "conj" | "interj" | "num"
      decl: int | None      # declension 1-5 for nominals
      variant: int | None   # Whitaker's variant number within the class
      conj: str | None      # "1" | "2" | "3" | "3-io" | "4" for verbs
      gender: str | None    # "m" | "f" | "n" | "c"
      age: str              # "A" archaic ... "G" neo-latin, "X" unknown
      freq: str             # "A" very frequent ... "X" unknown
      gloss_en: str
  ```
  and `parse_dictline(lines: Iterable[str]) -> list[Lemma]`.

- [ ] **Step 1: Write the failing test**

Use the real fixture, and assert on a line whose content you verified in Task 2. Replace the expected values below with what `docs/DATA.md` says the fixture line actually contains.

```python
from pathlib import Path

from casus_build.dictline import Lemma, parse_dictline

FIXTURE = Path(__file__).parent / "fixtures" / "dictline_sample.txt"


def _lemmas():
    return parse_dictline(FIXTURE.read_text(encoding="latin-1").splitlines())


def test_parses_every_fixture_line():
    lemmas = _lemmas()
    assert len(lemmas) == len(FIXTURE.read_text(encoding="latin-1").splitlines())


def test_first_declension_noun_has_gender_and_declension():
    rosa = next(l for l in _lemmas() if l.stems[0] == "ros" and l.pos == "noun")
    assert rosa.decl == 1
    assert rosa.gender == "f"
    assert "rose" in rosa.gloss_en.lower()


def test_io_verb_is_marked_as_third_io():
    capio = next(l for l in _lemmas() if l.pos == "verb" and l.stems[0].startswith("capi"))
    assert capio.conj == "3-io"


def test_ids_are_unique():
    lemmas = _lemmas()
    assert len({l.id for l in lemmas}) == len(lemmas)
```

- [ ] **Step 2: Run it, verify it fails**

Run: `python -m pytest tools/tests/test_dictline.py -q` — expected: ModuleNotFoundError.

- [ ] **Step 3: Implement `parse_dictline`**

Slice each line by the column spans recorded in `docs/DATA.md`, map Whitaker's part-of-speech and code letters to the vocabulary in the `Lemma` dataclass, and derive `conj == "3-io"` from the conjugation-plus-variant pair that Whitaker uses for `capiō`-type verbs (the fixture line tells you which pair that is). Unknown or blank codes become `"X"` for `age` and `freq`, and `None` for `decl`, `conj`, `gender` — never a guess, never a default of 1.

Raise a `ValueError` naming the offending line for anything unparseable, rather than skipping it silently; a silently dropped lemma becomes a missing word months later.

- [ ] **Step 4: Run it, verify it passes**

Run: `python -m pytest tools/tests/test_dictline.py -q` — expected: 4 passed.

- [ ] **Step 5: Run over the whole real file**

```bash
python -c "
from pathlib import Path
from casus_build.dictline import parse_dictline
lines = Path('vendor/whitakers-words/DICTLINE.GEN').read_text(encoding='latin-1').splitlines()
lemmas = parse_dictline(lines)
print(len(lemmas), 'lemmas')
"
```

Expected: tens of thousands of lemmas and no exception. If it raises, add the failing line to the fixture, write a test for it, then fix the parser — that is how the fixture grows.

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "feat: parse DICTLINE into typed lemma records"
```

---

### Task 5: Parse INFLECTS into inflection rules

**Files:**
- Create: `tools/casus_build/inflects.py`
- Test: `tools/tests/test_inflects.py`

**Interfaces:**
- Consumes: `tools/tests/fixtures/inflects_sample.txt`.
- Produces:
  ```python
  @dataclass(frozen=True)
  class Inflection:
      pos: str              # same vocabulary as Lemma.pos
      decl: int | None
      variant: int | None
      stem_key: int         # which of the lemma's stems this ending attaches to (1-4)
      ending: str
      age: str
      freq: str
      features: dict[str, str]   # nominal: case/number/gender; verb: person/number/tense/mood/voice
  ```
  and `parse_inflects(lines: Iterable[str]) -> list[Inflection]`.

- [ ] **Step 1: Write the failing test**

```python
from pathlib import Path

from casus_build.inflects import parse_inflects

FIXTURE = Path(__file__).parent / "fixtures" / "inflects_sample.txt"


def _rules():
    return parse_inflects(FIXTURE.read_text(encoding="latin-1").splitlines())


def test_skips_comments_and_blanks():
    raw = FIXTURE.read_text(encoding="latin-1").splitlines()
    meaningful = [l for l in raw if l.strip() and not l.startswith("--")]
    assert len(_rules()) == len(meaningful)


def test_nominal_rule_carries_case_and_number():
    noun_rules = [r for r in _rules() if r.pos == "noun"]
    assert noun_rules, "fixture must contain noun inflections"
    r = noun_rules[0]
    assert r.features["case"] in {"nom", "gen", "dat", "acc", "abl", "voc", "loc"}
    assert r.features["number"] in {"sg", "pl"}


def test_endings_are_normalised_for_lookup():
    for r in _rules():
        assert r.ending == r.ending.lower()
        assert "v" not in r.ending and "j" not in r.ending
```

- [ ] **Step 2: Run it, verify it fails**

Run: `python -m pytest tools/tests/test_inflects.py -q` — expected: ModuleNotFoundError.

- [ ] **Step 3: Implement `parse_inflects`**

Split on whitespace per the layout in `docs/DATA.md`, skip comment lines beginning `--` and blank lines, map Whitaker's case and number codes to the lowercase vocabulary above, and pass every ending through `normalize_form` so it composes with normalised stems in Task 6. Whitaker writes a zero-length ending for some forms; represent it as `""`, never `None`.

- [ ] **Step 4: Run it, verify it passes**

Run: `python -m pytest tools/tests/test_inflects.py -q` — expected: 3 passed.

- [ ] **Step 5: Run over the whole real file, then commit**

```bash
python -c "
from pathlib import Path
from casus_build.inflects import parse_inflects
print(len(parse_inflects(Path('vendor/whitakers-words/INFLECTS.LAT').read_text(encoding='latin-1').splitlines())), 'rules')
"
git add -A
git commit -m "feat: parse INFLECTS into typed inflection rules"
```

---

### Task 6: Expand lemmas × inflections into the form index

**Files:**
- Create: `tools/casus_build/expand.py`
- Test: `tools/tests/test_expand.py`

**Interfaces:**
- Consumes: `Lemma` (Task 4), `Inflection` (Task 5), `normalize_form` (Task 3).
- Produces:
  ```python
  Analysis = dict  # nominal: {"lemma","pos","case","number","gender"}
                   # verb:    {"lemma","pos","person","number","tense","mood","voice","conj"}
  def expand(lemmas: list[Lemma], rules: list[Inflection]) -> dict[str, list[Analysis]]
  ```
  Keys are normalised surface forms; values are every analysis that produces that form.

- [ ] **Step 1: Write the failing test**

```python
from casus_build.dictline import parse_dictline
from casus_build.expand import expand
from casus_build.inflects import parse_inflects
from pathlib import Path

F = Path(__file__).parent / "fixtures"


def _index():
    lemmas = parse_dictline((F / "dictline_sample.txt").read_text(encoding="latin-1").splitlines())
    rules = parse_inflects((F / "inflects_sample.txt").read_text(encoding="latin-1").splitlines())
    return expand(lemmas, rules)


def test_rosam_is_accusative_singular():
    analyses = _index()["rosam"]
    assert any(
        a["case"] == "acc" and a["number"] == "sg" and a["pos"] == "noun" for a in analyses
    )


def test_rosa_keeps_every_syncretic_reading():
    cases = {(a["case"], a["number"]) for a in _index()["rosa"] if a["pos"] == "noun"}
    assert ("nom", "sg") in cases
    assert ("abl", "sg") in cases


def test_keys_are_normalised():
    for key in _index():
        assert key == key.lower()
        assert "v" not in key and "j" not in key


def test_no_empty_analysis_lists():
    assert all(analyses for analyses in _index().values())
```

The second test is the spec's §4 principle expressed as a build-time assertion: syncretism must survive expansion. If expansion ever deduplicates `rosa` down to one reading, the whole app is broken.

- [ ] **Step 2: Run it, verify it fails**

Run: `python -m pytest tools/tests/test_expand.py -q`

- [ ] **Step 3: Implement `expand`**

For each lemma, for each rule matching its part of speech, declension or conjugation and variant, join the lemma's stem for that rule's `stem_key` with the rule's ending, normalise the result, and append the analysis carrying the lemma id and the rule's features. Skip rules whose `stem_key` exceeds the stems the lemma actually has (Whitaker uses `zzz` as an absent stem — treat it as absent, not as a literal stem).

Deduplicate identical analyses of the same form, but never merge analyses that differ in any feature.

- [ ] **Step 4: Run it, verify it passes, then run the full expansion**

```bash
python -m pytest tools/tests/test_expand.py -q
python -c "
from pathlib import Path
from casus_build.dictline import parse_dictline
from casus_build.inflects import parse_inflects
from casus_build.expand import expand
d = Path('vendor/whitakers-words')
idx = expand(
    parse_dictline((d / 'DICTLINE.GEN').read_text(encoding='latin-1').splitlines()),
    parse_inflects((d / 'INFLECTS.LAT').read_text(encoding='latin-1').splitlines()),
)
print(len(idx), 'distinct forms')
print(sum(len(v) for v in idx.values()), 'analyses')
"
```

Record both numbers in `docs/DATA.md`.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat: expand lemmas and inflections into the form index"
```

---

### Task 7: Shard, write assets, and measure — the size gate

This task answers spec §12 question 1. It has a **hard gate**: if the assets are too big, stop and report rather than continuing to the runtime tasks.

**Files:**
- Create: `tools/build_index.py`, `tools/casus_build/shard.py`
- Test: `tools/tests/test_shard.py`
- Output: `data/forms/<aa>.json`, `data/lemmas.json`, `data/glosses.en.json`, `data/manifest.json`

**Interfaces:**
- Consumes: `expand()` output, `parse_dictline()` output.
- Produces: `shard_key(form: str) -> str` returning the two-letter shard name (one letter for single-character forms); `write_assets(index, lemmas, out_dir) -> dict` returning the manifest. `data/manifest.json` records shard names, per-shard byte sizes, total size, form count and build date.

- [ ] **Step 1: Write the failing test**

```python
from casus_build.shard import shard_key, write_assets


def test_shard_key_uses_first_two_letters():
    assert shard_key("rosam") == "ro"
    assert shard_key("a") == "a"


def test_write_assets_emits_manifest_and_shards(tmp_path):
    index = {"rosam": [{"lemma": "ros:noun:1", "pos": "noun", "case": "acc",
                        "number": "sg", "gender": "f"}]}
    lemmas = {"ros:noun:1": {"dict_form": "rosa, -ae", "pos": "noun", "decl": 1,
                             "gender": "f", "age": "X", "freq": "A"}}
    manifest = write_assets(index, lemmas, tmp_path)
    assert (tmp_path / "forms" / "ro.json").exists()
    assert (tmp_path / "manifest.json").exists()
    assert manifest["shards"]["ro"]["forms"] == 1
    assert manifest["total_bytes"] > 0


def test_every_form_lands_in_exactly_one_shard(tmp_path):
    index = {f"form{i}": [{"lemma": "x", "pos": "noun", "case": "nom",
                           "number": "sg", "gender": "m"}] for i in range(50)}
    manifest = write_assets(index, {}, tmp_path)
    assert sum(s["forms"] for s in manifest["shards"].values()) == 50
```

- [ ] **Step 2: Run it, verify it fails**

Run: `python -m pytest tools/tests/test_shard.py -q`

- [ ] **Step 3: Implement sharding and the writer**

Write compact JSON (no indentation, no spaces after separators). Shard files map form to a list of analyses. Keep the analysis keys short but spelled out in `docs/DATA.md`; do not obfuscate them into single letters until a measurement says it matters.

`tools/build_index.py` is the entry point: reads `vendor/`, runs Tasks 4–6, writes to `data/`, prints the manifest summary.

- [ ] **Step 4: Run the real build and measure**

```bash
python tools/build_index.py
du -sh data/
ls data/forms | wc -l
gzip -c data/forms/in.json | wc -c   # a representative shard, gzipped
python -c "import json;m=json.load(open('data/manifest.json'));print(m['total_bytes'])"
```

- [ ] **Step 5: Apply the gate**

Budget: a shard a reader actually needs should be **under about 300 KB gzipped**, and the whole `data/` tree should be **under about 25 MB** uncommitted-size before compression.

- Within budget: record the measurements in `docs/DATA.md` and continue.
- Over budget: **stop**. Do not proceed to Task 8. Report the numbers and the options — shorter analysis keys, a binary encoding, dropping rare-lemma analyses behind a flag, or falling back to the stem-plus-ending engine port that spec §12 names as the alternative. This is a design decision, not an implementation detail, and it goes back to the spec author.

- [ ] **Step 6: Commit**

Commit `data/` only if the gate passed and the tree is within budget; otherwise commit the tools and the measurements alone.

```bash
git add -A
git commit -m "feat: shard and write form index assets with size manifest"
```

---

### Task 8: Gloss files, English and Portuguese

**Files:**
- Create: `tools/casus_build/glosses.py`, `tools/fetch_glosses_pt.sh`
- Modify: `NOTICE.md`, `tools/build_index.py`
- Test: `tools/tests/test_glosses.py`
- Output: `data/glosses.en.json`, `data/glosses.pt.json`

**Interfaces:**
- Consumes: `Lemma.gloss_en` (Task 4); a Wiktextract JSONL dump of Portuguese Wiktionary.
- Produces: `build_en_glosses(lemmas) -> dict[str, str]` keyed by lemma id; `build_pt_glosses(jsonl_lines, lemmas) -> dict[str, str]` keyed by lemma id, matched on the lemma's dictionary headword; `gloss_coverage(pt, lemmas) -> float`.

- [ ] **Step 1: Write the failing test**

```python
from casus_build.glosses import build_pt_glosses, gloss_coverage

LEMMAS = {
    "ros:noun:1": {"headword": "rosa", "pos": "noun"},
    "urb:noun:1": {"headword": "urbs", "pos": "noun"},
}

JSONL = [
    '{"word": "rosa", "lang_code": "la", "pos": "noun", "senses": [{"glosses": ["rosa"]}]}',
    '{"word": "canis", "lang_code": "la", "pos": "noun", "senses": [{"glosses": ["cão"]}]}',
    '{"word": "rose", "lang_code": "en", "pos": "noun", "senses": [{"glosses": ["flor"]}]}',
]


def test_matches_latin_entries_by_headword():
    glosses = build_pt_glosses(JSONL, LEMMAS)
    assert glosses["ros:noun:1"] == "rosa"


def test_ignores_non_latin_entries():
    glosses = build_pt_glosses(JSONL, LEMMAS)
    assert all("flor" not in g for g in glosses.values())


def test_missing_lemmas_are_absent_not_empty():
    glosses = build_pt_glosses(JSONL, LEMMAS)
    assert "urb:noun:1" not in glosses


def test_coverage_is_reported():
    assert gloss_coverage(build_pt_glosses(JSONL, LEMMAS), LEMMAS) == 0.5
```

`test_missing_lemmas_are_absent_not_empty` matters: the runtime distinguishes "no Portuguese gloss, fall back to English" from "empty gloss", and an empty string would render as a blank definition.

- [ ] **Step 2: Run it, verify it fails**

Run: `python -m pytest tools/tests/test_glosses.py -q`

- [ ] **Step 3: Implement, and write the fetch script**

`tools/fetch_glosses_pt.sh` downloads the Portuguese Wiktionary extraction from kaikki.org into `vendor/`. Match only entries whose `lang_code` is `la`, join to lemmas on normalised headword plus part of speech, and take the first sense's first gloss — richer sense structure is a v2 concern.

- [ ] **Step 4: Run it, verify it passes, then measure real coverage**

```bash
python -m pytest tools/tests/test_glosses.py -q
bash tools/fetch_glosses_pt.sh
python tools/build_index.py --with-pt-glosses
```

Print and record the coverage percentage in `docs/DATA.md`. This answers spec §12 question 3: below roughly 40% the Portuguese layer is a convenience, not a headline feature, and the UI plan should present it accordingly.

- [ ] **Step 5: Update `NOTICE.md`**

Fill the Portuguese section: source, extraction date, CC BY-SA attribution and share-alike statement, and the explicit note that `glosses.pt.json` is separately licensed from the Whitaker-derived assets.

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "feat: build English and Portuguese gloss assets with coverage reporting"
```

---

### Task 9: `segment.js` — sentences

**Files:**
- Create: `src/lib/segment.js`
- Test: `tests/segment.test.js`

**Interfaces:**
- Consumes: nothing.
- Produces: `segment(text: string): Array<{ start: number, end: number, text: string }>` — half-open ranges into the original string, so the left pane can highlight the exact span.

- [ ] **Step 1: Write the failing test**

```js
import { describe, it, expect } from 'vitest';
import { segment } from '../src/lib/segment.js';

describe('segment', () => {
  it('splits on sentence-final punctuation', () => {
    const s = segment('Gallia est omnis divisa. Hi omnes differunt.');
    expect(s).toHaveLength(2);
    expect(s[0].text).toBe('Gallia est omnis divisa.');
  });

  it('keeps ranges pointing into the original text', () => {
    const text = 'Alpha. Beta.';
    const [, second] = segment(text);
    expect(text.slice(second.start, second.end)).toBe(second.text);
  });

  it('does not split on praenomen abbreviations', () => {
    expect(segment('Cn. Pompeius consul erat.')).toHaveLength(1);
  });

  it('does not split inside a date formula', () => {
    expect(segment('Venit a.d. III Kal. Apr. cum legione.')).toHaveLength(1);
  });

  it('does not split on an ellipsis', () => {
    expect(segment('Dixit ... deinde tacuit.')).toHaveLength(1);
  });

  it('handles a question mark and an exclamation', () => {
    expect(segment('Quo usque tandem? O tempora!')).toHaveLength(2);
  });

  it('returns an empty array for blank input', () => {
    expect(segment('   ')).toEqual([]);
  });
});
```

- [ ] **Step 2: Run it, verify it fails**

Run: `npx vitest run tests/segment.test.js`

- [ ] **Step 3: Implement**

```js
const ABBREVIATIONS = new Set([
  'a', 'c', 'cn', 'd', 'l', 'm', 'p', 'q', 's', 't', 'ti', 'sex', 'ser', 'app',
  'kal', 'non', 'id', 'cos', 'coss', 'pr', 'des', 'f', 'n',
]);
const ROMAN = /^[ivxlcdm]+$/;

/** Split text into sentences, guarding abbreviations, numerals and ellipses. */
export function segment(text) {
  const out = [];
  let start = 0;
  for (let i = 0; i < text.length; i += 1) {
    const ch = text[i];
    if (ch !== '.' && ch !== '?' && ch !== '!') continue;
    if (ch === '.' && isGuarded(text, i)) continue;
    const end = i + 1;
    pushSpan(out, text, start, end);
    start = end;
  }
  pushSpan(out, text, start, text.length);
  return out;
}

function isGuarded(text, i) {
  if (text[i + 1] === '.' || text[i - 1] === '.') return true; // ellipsis
  const before = /([A-Za-z]+)$/.exec(text.slice(0, i));
  if (!before) return false;
  const word = before[1].toLowerCase();
  return ABBREVIATIONS.has(word) || ROMAN.test(word);
}

function pushSpan(out, text, start, end) {
  const slice = text.slice(start, end);
  if (!slice.trim()) return;
  const lead = slice.length - slice.trimStart().length;
  out.push({ start: start + lead, end, text: slice.trim() });
}
```

- [ ] **Step 4: Run it, verify it passes**

Run: `npx vitest run tests/segment.test.js` — expected: 7 passed.

- [ ] **Step 5: Commit**

```bash
git add src/lib/segment.js tests/segment.test.js
git commit -m "feat: sentence segmentation with abbreviation and numeral guards"
```

---

### Task 10: `tokenize.js` — words and enclitics

Per spec §5.2 this module is deliberately replaceable: nothing downstream may assume a token came from whitespace splitting, because scriptio continua support (spec §10.3) will substitute a different tokenizer in v2.

**Files:**
- Create: `src/lib/tokenize.js`
- Test: `tests/tokenize.test.js`

**Interfaces:**
- Consumes: `normalizeForm` (Task 3).
- Produces:
  ```
  Token = { index: number, surface: string, key: string, kind: 'word' | 'punct',
            enclitic: string | null, start: number, end: number }
  tokenize(sentenceText: string): Token[]
  ```
  `index` is the position in the original reading order and is what the UI shows as the superscript. `key` is the normalised lookup key.

- [ ] **Step 1: Write the failing test**

```js
import { describe, it, expect } from 'vitest';
import { tokenize } from '../src/lib/tokenize.js';

describe('tokenize', () => {
  it('numbers tokens in reading order', () => {
    expect(tokenize('Caesar venit').map((t) => t.index)).toEqual([0, 1]);
  });

  it('normalises the lookup key but keeps the surface', () => {
    const [t] = tokenize('Iulius');
    expect(t.surface).toBe('Iulius');
    expect(t.key).toBe('iulius');
  });

  it('splits the enclitic -que into its own token', () => {
    const tokens = tokenize('senatus populusque');
    expect(tokens.map((t) => t.key)).toEqual(['senatus', 'populus', 'que']);
    expect(tokens[1].enclitic).toBe('que');
  });

  it('does not split words that merely end in que', () => {
    expect(tokenize('quinque').map((t) => t.key)).toEqual(['quinque']);
  });

  it('emits punctuation as its own token', () => {
    const kinds = tokenize('Caesar, dux').map((t) => t.kind);
    expect(kinds).toEqual(['word', 'punct', 'word']);
  });

  it('records offsets into the sentence', () => {
    const text = 'Caesar venit';
    const [, second] = tokenize(text);
    expect(text.slice(second.start, second.end)).toBe('venit');
  });
});
```

`quinque` is the test that matters: naive enclitic splitting mangles a list of very common words (`quinque`, `neque`, `usque`, `atque`, `itaque`, `denique`).

- [ ] **Step 2: Run it, verify it fails**

Run: `npx vitest run tests/tokenize.test.js`

- [ ] **Step 3: Implement**

```js
import { normalizeForm } from './normalize.js';

const ENCLITICS = ['que', 'ue', 'ne'];
const NEVER_SPLIT = new Set([
  'quinque', 'neque', 'usque', 'atque', 'itaque', 'denique', 'undique', 'quisque',
  'uterque', 'plerumque', 'namque', 'quoque', 'absque', 'cunque', 'utique',
  'bene', 'sine', 'omne', 'paene', 'pone', 'mane',
]);

/** Split a sentence into word and punctuation tokens, detaching enclitics. */
export function tokenize(sentenceText) {
  const tokens = [];
  const re = /(\p{L}+)|([^\s\p{L}]+)/gu;
  for (let m = re.exec(sentenceText); m; m = re.exec(sentenceText)) {
    const [raw, word, punct] = m;
    if (punct) {
      push(tokens, { surface: raw, kind: 'punct', enclitic: null, start: m.index });
      continue;
    }
    const split = splitEnclitic(word);
    let offset = m.index;
    for (const part of split.parts) {
      push(tokens, {
        surface: part,
        kind: 'word',
        enclitic: split.parts.length > 1 && part === split.enclitic ? null : split.enclitic,
        start: offset,
      });
      offset += part.length;
    }
  }
  return tokens;
}

function splitEnclitic(word) {
  const key = normalizeForm(word);
  if (NEVER_SPLIT.has(key)) return { parts: [word], enclitic: null };
  for (const enc of ENCLITICS) {
    if (key.length > enc.length + 2 && key.endsWith(enc)) {
      const cut = word.length - enc.length;
      return { parts: [word.slice(0, cut), word.slice(cut)], enclitic: enc };
    }
  }
  return { parts: [word], enclitic: null };
}

function push(tokens, { surface, kind, enclitic, start }) {
  tokens.push({
    index: tokens.length,
    surface,
    key: normalizeForm(surface),
    kind,
    enclitic,
    start,
    end: start + surface.length,
  });
}
```

- [ ] **Step 4: Run it, verify it passes**

Run: `npx vitest run tests/tokenize.test.js` — expected: 6 passed. Note the enclitic token itself carries `enclitic: null`; only the host word records which enclitic was detached.

- [ ] **Step 5: Commit**

```bash
git add src/lib/tokenize.js tests/tokenize.test.js
git commit -m "feat: tokenizer with enclitic splitting and a never-split list"
```

---

### Task 11: `lexicon.js` — shard loading and lookup

**Files:**
- Create: `src/lib/lexicon.js`
- Test: `tests/lexicon.test.js`

**Interfaces:**
- Consumes: the shard layout from Task 7.
- Produces:
  ```
  createLexicon({ fetchShard, manifest }): {
    lookup(key: string): Promise<Analysis[]>,
    lookupAll(keys: string[]): Promise<Map<string, Analysis[]>>,
    loadedShards(): string[]
  }
  ```
  `fetchShard(name: string): Promise<object>` is injected — the module never calls `fetch` itself, which is what keeps it DOM-free and testable.

- [ ] **Step 1: Write the failing test**

```js
import { describe, it, expect, vi } from 'vitest';
import { createLexicon } from '../src/lib/lexicon.js';

const SHARDS = {
  ro: { rosam: [{ lemma: 'ros:noun:1', pos: 'noun', case: 'acc', number: 'sg', gender: 'f' }] },
  ur: { urbem: [{ lemma: 'urb:noun:1', pos: 'noun', case: 'acc', number: 'sg', gender: 'f' }] },
};

function makeFetch() {
  return vi.fn(async (name) => structuredClone(SHARDS[name] ?? {}));
}

describe('createLexicon', () => {
  it('looks a form up from its shard', async () => {
    const lex = createLexicon({ fetchShard: makeFetch() });
    expect((await lex.lookup('rosam'))[0].case).toBe('acc');
  });

  it('returns an empty array for an unknown form', async () => {
    const lex = createLexicon({ fetchShard: makeFetch() });
    expect(await lex.lookup('xyzzy')).toEqual([]);
  });

  it('fetches each shard at most once', async () => {
    const fetchShard = makeFetch();
    const lex = createLexicon({ fetchShard });
    await lex.lookup('rosam');
    await lex.lookup('rosam');
    expect(fetchShard).toHaveBeenCalledTimes(1);
  });

  it('deduplicates shards across a batch lookup', async () => {
    const fetchShard = makeFetch();
    const lex = createLexicon({ fetchShard });
    const found = await lex.lookupAll(['rosam', 'urbem', 'rosam']);
    expect(found.get('urbem')).toHaveLength(1);
    expect(fetchShard).toHaveBeenCalledTimes(2);
  });

  it('survives a failed shard fetch without throwing', async () => {
    const lex = createLexicon({ fetchShard: async () => { throw new Error('offline'); } });
    expect(await lex.lookup('rosam')).toEqual([]);
  });
});
```

- [ ] **Step 2: Run it, verify it fails**

Run: `npx vitest run tests/lexicon.test.js`

- [ ] **Step 3: Implement**

Cache shard promises (not resolved values) in a `Map`, so concurrent lookups of the same shard share one fetch. Derive the shard name with the same two-letter rule as `shard_key` in Task 7 — a mismatch here produces silent total lookup failure, so mirror the rule exactly and note the pairing in a comment.

A failed fetch resolves to an empty shard and is recorded, never thrown: a missing shard degrades one word, and must not take down the sentence.

- [ ] **Step 4: Run it, verify it passes**

Run: `npx vitest run tests/lexicon.test.js` — expected: 5 passed.

- [ ] **Step 5: Commit**

```bash
git add src/lib/lexicon.js tests/lexicon.test.js
git commit -m "feat: lexicon with injected shard fetching and per-shard caching"
```

---

### Task 12: `disambiguate.js` stage 1 — the candidate model and lexical narrowing

**Files:**
- Create: `src/lib/disambiguate.js`
- Test: `tests/disambiguate.stage1.test.js`

**Interfaces:**
- Consumes: `Token` (Task 10), `Analysis` (Task 7).
- Produces:
  ```
  Candidate = { analysis: Analysis, reasons: string[] }
  Block = { token: Token, candidates: Candidate[], pinned: Analysis | null, resolved: boolean }
  buildBlocks(tokens: Token[], analysesByKey: Map<string, Analysis[]>): Block[]
  narrow(blocks: Block[], stage: (blocks) => Block[]): Block[]
  ```
  `narrow` is the invariant guard every stage runs through: it applies a stage and reverts any block the stage emptied. `resolved` is true when exactly one candidate remains.

- [ ] **Step 1: Write the failing test**

```js
import { describe, it, expect } from 'vitest';
import { buildBlocks, narrow } from '../src/lib/disambiguate.js';

const rosa = [
  { lemma: 'ros:noun:1', pos: 'noun', case: 'nom', number: 'sg', gender: 'f' },
  { lemma: 'ros:noun:1', pos: 'noun', case: 'abl', number: 'sg', gender: 'f' },
  { lemma: 'ros:noun:1', pos: 'noun', case: 'voc', number: 'sg', gender: 'f' },
];

const tokens = [{ index: 0, surface: 'rosa', key: 'rosa', kind: 'word', enclitic: null }];

describe('buildBlocks', () => {
  it('keeps every analysis as a candidate', () => {
    const [block] = buildBlocks(tokens, new Map([['rosa', rosa]]));
    expect(block.candidates).toHaveLength(3);
    expect(block.resolved).toBe(false);
  });

  it('marks a single-analysis block resolved', () => {
    const one = [rosa[0]];
    const [block] = buildBlocks(tokens, new Map([['rosa', one]]));
    expect(block.resolved).toBe(true);
  });

  it('keeps unknown words as blocks with no candidates', () => {
    const [block] = buildBlocks(tokens, new Map());
    expect(block.candidates).toEqual([]);
    expect(block.resolved).toBe(false);
  });

  it('skips punctuation tokens', () => {
    const withPunct = [...tokens, { index: 1, surface: ',', key: ',', kind: 'punct' }];
    expect(buildBlocks(withPunct, new Map([['rosa', rosa]]))).toHaveLength(1);
  });
});

describe('narrow', () => {
  it('applies a stage that removes some candidates', () => {
    const blocks = buildBlocks(tokens, new Map([['rosa', rosa]]));
    const dropVoc = (bs) => bs.map((b) => ({
      ...b,
      candidates: b.candidates.filter((c) => c.analysis.case !== 'voc'),
    }));
    expect(narrow(blocks, dropVoc)[0].candidates).toHaveLength(2);
  });

  it('reverts a stage that would empty a block', () => {
    const blocks = buildBlocks(tokens, new Map([['rosa', rosa]]));
    const dropAll = (bs) => bs.map((b) => ({ ...b, candidates: [] }));
    expect(narrow(blocks, dropAll)[0].candidates).toHaveLength(3);
  });

  it('reverts only the emptied block, keeping other narrowing', () => {
    const two = [
      ...tokens,
      { index: 1, surface: 'urbem', key: 'urbem', kind: 'word', enclitic: null },
    ];
    const blocks = buildBlocks(two, new Map([['rosa', rosa], ['urbem', [rosa[0]]]]));
    const dropNom = (bs) => bs.map((b) => ({
      ...b,
      candidates: b.candidates.filter((c) => c.analysis.case !== 'nom'),
    }));
    const out = narrow(blocks, dropNom);
    expect(out[0].candidates).toHaveLength(2); // narrowed
    expect(out[1].candidates).toHaveLength(1); // reverted, not emptied
  });
});
```

The last two tests are the global invariant from the constraints section. They must never be weakened.

- [ ] **Step 2: Run it, verify it fails**

Run: `npx vitest run tests/disambiguate.stage1.test.js`

- [ ] **Step 3: Implement `buildBlocks` and `narrow`**

`buildBlocks` drops punctuation tokens, wraps each analysis in a `Candidate` whose `reasons` starts with `'lexicon: attested form'`, and computes `resolved`. `narrow` runs the stage, then walks the result alongside the input and restores any block whose candidate list went from non-empty to empty. Blocks that started empty stay empty — an unknown word is not something a stage can revert into existence.

Everything is pure and immutable: stages return new arrays, never mutate their input.

- [ ] **Step 4: Run it, verify it passes**

Run: `npx vitest run tests/disambiguate.stage1.test.js` — expected: 7 passed.

- [ ] **Step 5: Commit**

```bash
git add src/lib/disambiguate.js tests/disambiguate.stage1.test.js
git commit -m "feat: candidate model and never-empty narrowing guard"
```

---

### Task 13: Stage 2 — agreement

**Files:**
- Modify: `src/lib/disambiguate.js`
- Test: `tests/disambiguate.agreement.test.js`

**Interfaces:**
- Consumes: `Block`, `narrow` (Task 12).
- Produces: `agreementStage(blocks: Block[]): Block[]`, exported and composable through `narrow`.

- [ ] **Step 1: Write the failing test**

```js
import { describe, it, expect } from 'vitest';
import { buildBlocks, narrow, agreementStage } from '../src/lib/disambiguate.js';

const magnam = [
  { lemma: 'magn:adj:1', pos: 'adj', case: 'acc', number: 'sg', gender: 'f' },
  { lemma: 'magn:adj:1', pos: 'adj', case: 'gen', number: 'pl', gender: 'f' },
];
const urbem = [
  { lemma: 'urb:noun:1', pos: 'noun', case: 'acc', number: 'sg', gender: 'f' },
];
const rosa = [
  { lemma: 'ros:noun:1', pos: 'noun', case: 'nom', number: 'sg', gender: 'f' },
  { lemma: 'ros:noun:1', pos: 'noun', case: 'abl', number: 'sg', gender: 'f' },
];

function blocksFor(pairs) {
  const tokens = pairs.map(([key], i) => ({
    index: i, surface: key, key, kind: 'word', enclitic: null,
  }));
  return buildBlocks(tokens, new Map(pairs));
}

describe('agreementStage', () => {
  it('narrows an adjective to the reading that agrees with a resolved noun', () => {
    const out = narrow(blocksFor([['magnam', magnam], ['urbem', urbem]]), agreementStage);
    expect(out[0].candidates).toHaveLength(1);
    expect(out[0].candidates[0].analysis.case).toBe('acc');
  });

  it('records why the candidate survived', () => {
    const out = narrow(blocksFor([['magnam', magnam], ['urbem', urbem]]), agreementStage);
    expect(out[0].candidates[0].reasons.join(' ')).toMatch(/agree/i);
  });

  it('leaves both ambiguous when nothing agrees', () => {
    const out = narrow(blocksFor([['rosa', rosa]]), agreementStage);
    expect(out[0].candidates).toHaveLength(2);
  });

  it('does not treat two nouns as an agreement pair by accident', () => {
    const out = narrow(blocksFor([['rosa', rosa], ['urbem', urbem]]), agreementStage);
    expect(out[0].candidates).toHaveLength(2);
  });

  it('is idempotent', () => {
    const once = narrow(blocksFor([['magnam', magnam], ['urbem', urbem]]), agreementStage);
    const twice = narrow(once, agreementStage);
    expect(twice[0].candidates).toHaveLength(1);
  });
});
```

- [ ] **Step 2: Run it, verify it fails**

Run: `npx vitest run tests/disambiguate.agreement.test.js` — expected: `agreementStage is not a function`.

- [ ] **Step 3: Implement `agreementStage`**

For each adjective or participle block, keep the candidates whose case, number and gender match at least one candidate of some **noun or pronoun** block in the sentence, preferring resolved nouns; if no nominal matches at all, leave the block untouched rather than emptying it. Append a reason naming the agreeing token, e.g. `agreement: matches urbem (acc sg f)`. Only adjective, participle and pronoun blocks are narrowed by this stage — nouns are evidence, not targets, which is what the fourth test pins down.

Note the deliberate limitation for `docs/`: an adjective can agree with a noun it does not modify. Stage 2 narrows, it does not parse syntax, and where it is wrong the reader repins.

- [ ] **Step 4: Run it, verify it passes, then commit**

```bash
npx vitest run tests/disambiguate.agreement.test.js
git add -A
git commit -m "feat: agreement stage narrows adjectives against nominals"
```

---

### Task 14: Stage 3 — government, bidirectional

**Files:**
- Create: `src/lib/prepositions.js`
- Modify: `src/lib/disambiguate.js`
- Test: `tests/disambiguate.government.test.js`

**Interfaces:**
- Consumes: `Block`, `narrow`.
- Produces: `GOVERNMENT: Record<string, string[]>` mapping a normalised preposition to the cases it governs; `governmentStage(blocks: Block[]): Block[]`.

- [ ] **Step 1: Write the preposition table**

`src/lib/prepositions.js`:
```js
/** Normalised preposition -> cases governed. Keys use normalizeForm conventions (u for v). */
export const GOVERNMENT = {
  a: ['abl'], ab: ['abl'], abs: ['abl'], cum: ['abl'], de: ['abl'], e: ['abl'],
  ex: ['abl'], prae: ['abl'], pro: ['abl'], sine: ['abl'], coram: ['abl'],
  ad: ['acc'], ante: ['acc'], apud: ['acc'], circum: ['acc'], contra: ['acc'],
  inter: ['acc'], intra: ['acc'], ob: ['acc'], per: ['acc'], post: ['acc'],
  praeter: ['acc'], propter: ['acc'], trans: ['acc'], ultra: ['acc'],
  in: ['acc', 'abl'], sub: ['acc', 'abl'], super: ['acc', 'abl'], subter: ['acc', 'abl'],
};
```

- [ ] **Step 2: Write the failing test**

```js
import { describe, it, expect } from 'vitest';
import { buildBlocks, narrow, governmentStage } from '../src/lib/disambiguate.js';

const inPrep = [{ lemma: 'in:prep:1', pos: 'prep' }];
const galliam = [
  { lemma: 'gall:noun:1', pos: 'noun', case: 'acc', number: 'sg', gender: 'f' },
];
const urbe = [
  { lemma: 'urb:noun:1', pos: 'noun', case: 'abl', number: 'sg', gender: 'f' },
];
const ambiguous = [
  { lemma: 'x:noun:1', pos: 'noun', case: 'acc', number: 'sg', gender: 'f' },
  { lemma: 'x:noun:1', pos: 'noun', case: 'abl', number: 'sg', gender: 'f' },
  { lemma: 'x:noun:1', pos: 'noun', case: 'dat', number: 'sg', gender: 'f' },
];

function blocksFor(pairs) {
  const tokens = pairs.map(([key], i) => ({
    index: i, surface: key, key, kind: 'word', enclitic: null,
  }));
  return buildBlocks(tokens, new Map(pairs));
}

describe('governmentStage', () => {
  it('narrows the object to a case the preposition governs', () => {
    const out = narrow(blocksFor([['in', inPrep], ['x', ambiguous]]), governmentStage);
    const cases = out[1].candidates.map((c) => c.analysis.case).sort();
    expect(cases).toEqual(['abl', 'acc']); // dative eliminated
  });

  it('resolves the preposition from an unambiguous object', () => {
    const out = narrow(blocksFor([['in', inPrep], ['galliam', galliam]]), governmentStage);
    expect(out[0].candidates[0].analysis.governs).toEqual(['acc']);
  });

  it('resolves in + ablative object to the ablative sense', () => {
    const out = narrow(blocksFor([['in', inPrep], ['urbe', urbe]]), governmentStage);
    expect(out[0].candidates[0].analysis.governs).toEqual(['abl']);
  });

  it('leaves both ambiguous when neither settles the other', () => {
    const out = narrow(blocksFor([['in', inPrep], ['x', ambiguous]]), governmentStage);
    expect(out[0].candidates[0].analysis.governs).toEqual(['acc', 'abl']);
  });

  it('applies an unambiguous preposition without needing agreement', () => {
    const out = narrow(blocksFor([['cum', [{ lemma: 'cum:prep:1', pos: 'prep' }]],
                                  ['x', ambiguous]]), governmentStage);
    expect(out[1].candidates.map((c) => c.analysis.case)).toEqual(['abl']);
  });

  it('never empties an object that matches no governed case', () => {
    const genOnly = [{ lemma: 'y:noun:1', pos: 'noun', case: 'gen', number: 'sg', gender: 'f' }];
    const out = narrow(blocksFor([['cum', [{ lemma: 'cum:prep:1', pos: 'prep' }]],
                                  ['y', genOnly]]), governmentStage);
    expect(out[1].candidates).toHaveLength(1);
  });
});
```

- [ ] **Step 3: Run it, verify it fails, then implement**

Run: `npx vitest run tests/disambiguate.government.test.js`

Implement: annotate every preposition block's candidates with `governs` from `GOVERNMENT` (default `[]` for an unlisted word). Then for each preposition, take the next word block to its right as its object — v1 assumes adjacency, which spec §7.5 already describes as the glue default, and anastrophe is handled by the reader ungluing in the UI. Narrow the object to candidates whose case is governed; if the object's surviving cases select exactly one governed case, narrow the preposition's `governs` to it and record the reason on both sides, e.g. `government: in + acc (object urbem is accusative)`.

The last test is the invariant again, from the government direction.

- [ ] **Step 4: Run it, verify it passes, then commit**

```bash
npx vitest run tests/disambiguate.government.test.js
git add -A
git commit -m "feat: bidirectional preposition government stage"
```

---

### Task 15: The cascade, pins, and re-run

**Files:**
- Modify: `src/lib/disambiguate.js`
- Create: `src/lib/state.js`
- Test: `tests/cascade.test.js`, `tests/state.test.js`

**Interfaces:**
- Consumes: everything above.
- Produces:
  ```
  runCascade(tokens: Token[], analysesByKey: Map<string, Analysis[]>,
             options?: { pins?: Map<number, Analysis> }): Block[]
  createState({ text, lexicon }): {
    load(): Promise<void>,
    sentences(): Array<{ start, end, text }>,
    select(i: number): void,
    blocks(): Block[],
    pin(tokenIndex: number, analysis: Analysis): void,
    unpin(tokenIndex: number): void,
    toJSON(): object
  }
  ```
  `state.js` holds selection, pins and order. It takes an already-built lexicon, so it never fetches.

- [ ] **Step 1: Write the failing cascade test**

```js
import { describe, it, expect } from 'vitest';
import { runCascade } from '../src/lib/disambiguate.js';

const inPrep = [{ lemma: 'in:prep:1', pos: 'prep' }];
const magnam = [
  { lemma: 'magn:adj:1', pos: 'adj', case: 'acc', number: 'sg', gender: 'f' },
  { lemma: 'magn:adj:1', pos: 'adj', case: 'gen', number: 'pl', gender: 'f' },
];
const urbem = [
  { lemma: 'urb:noun:1', pos: 'noun', case: 'acc', number: 'sg', gender: 'f' },
  { lemma: 'urb:noun:1', pos: 'noun', case: 'dat', number: 'pl', gender: 'f' },
];

const tokens = ['in', 'magnam', 'urbem'].map((key, index) => ({
  index, surface: key, key, kind: 'word', enclitic: null,
}));
const analyses = new Map([['in', inPrep], ['magnam', magnam], ['urbem', urbem]]);

describe('runCascade', () => {
  it('resolves a chain through government and agreement', () => {
    const blocks = runCascade(tokens, analyses);
    expect(blocks[2].candidates.map((c) => c.analysis.case)).toEqual(['acc']);
    expect(blocks[1].candidates.map((c) => c.analysis.case)).toEqual(['acc']);
  });

  it('carries a reason for every surviving candidate', () => {
    for (const block of runCascade(tokens, analyses)) {
      for (const candidate of block.candidates) {
        expect(candidate.reasons.length).toBeGreaterThan(0);
      }
    }
  });

  it('never empties a candidate set', () => {
    const junk = new Map([['in', inPrep], ['magnam', magnam],
                          ['urbem', [{ lemma: 'z', pos: 'noun', case: 'gen',
                                       number: 'sg', gender: 'm' }]]]);
    for (const block of runCascade(tokens, junk)) {
      expect(block.candidates.length).toBeGreaterThan(0);
    }
  });

  it('propagates a pin through agreement', () => {
    const pins = new Map([[2, urbem[1]]]); // reader pins urbem as dat pl
    const blocks = runCascade(tokens, analyses, { pins });
    expect(blocks[2].candidates).toHaveLength(1);
    expect(blocks[2].pinned).toEqual(urbem[1]);
    expect(blocks[1].candidates.map((c) => c.analysis.case)).not.toEqual(['acc']);
  });

  it('is deterministic', () => {
    expect(runCascade(tokens, analyses)).toEqual(runCascade(tokens, analyses));
  });
});
```

- [ ] **Step 2: Write the failing state test**

```js
import { describe, it, expect } from 'vitest';
import { createState } from '../src/lib/state.js';

const lexicon = {
  lookupAll: async (keys) => new Map(keys.map((k) => [k, [
    { lemma: `${k}:noun:1`, pos: 'noun', case: 'nom', number: 'sg', gender: 'f' },
  ]])),
};

describe('createState', () => {
  it('exposes sentences after loading', async () => {
    const s = createState({ text: 'Rosa bona. Urbs magna.', lexicon });
    await s.load();
    expect(s.sentences()).toHaveLength(2);
  });

  it('builds blocks only for the selected sentence', async () => {
    const s = createState({ text: 'Rosa bona. Urbs magna.', lexicon });
    await s.load();
    s.select(1);
    expect(s.blocks().map((b) => b.token.surface)).toEqual(['Urbs', 'magna']);
  });

  it('round-trips pins through toJSON', async () => {
    const s = createState({ text: 'Rosa bona.', lexicon });
    await s.load();
    const analysis = s.blocks()[0].candidates[0].analysis;
    s.pin(0, analysis);
    expect(s.toJSON().pins).toEqual([{ tokenIndex: 0, analysis }]);
    s.unpin(0);
    expect(s.toJSON().pins).toEqual([]);
  });
});
```

- [ ] **Step 3: Run both, verify they fail**

Run: `npx vitest run tests/cascade.test.js tests/state.test.js`

- [ ] **Step 4: Implement**

`runCascade` builds blocks, applies pins as fixed single-candidate sets before any stage, then runs `narrow(blocks, agreementStage)` and `narrow(blocks, governmentStage)` — government first, then agreement, then government once more, since resolving an object can feed agreement which can feed another preposition. Two passes are enough for v1; note in a comment that a fixed-point loop is a later refinement and would need a cycle guard.

`state.js` holds `{ text, sentences, selected, pins, order }`, recomputes blocks on selection or pin change, and serialises to a plain object for persistence. No `localStorage` here — that belongs to the UI plan; `toJSON` is the boundary.

- [ ] **Step 5: Run both, verify they pass**

Run: `npx vitest run` — the whole suite green.

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "feat: cascade with pins and sentence-scoped parser state"
```

---

### Task 16: CLI harness — the end-to-end deliverable

**Files:**
- Create: `tools/parse_cli.mjs`
- Modify: `package.json` (add `"parse": "node tools/parse_cli.mjs"`), `README.md`
- Test: `tests/cli.test.js`

**Interfaces:**
- Consumes: `createState`, `createLexicon`, the built `data/` assets.
- Produces: `node tools/parse_cli.mjs "<latin text>"` printing one line per block: index, surface, and either the resolved analysis or every surviving candidate with its reason.

- [ ] **Step 1: Write the failing test**

```js
import { describe, it, expect } from 'vitest';
import { formatBlocks } from '../tools/parse_cli.mjs';

const block = {
  token: { index: 0, surface: 'rosa' },
  pinned: null,
  resolved: false,
  candidates: [
    { analysis: { pos: 'noun', case: 'nom', number: 'sg', gender: 'f' },
      reasons: ['lexicon: attested form'] },
    { analysis: { pos: 'noun', case: 'abl', number: 'sg', gender: 'f' },
      reasons: ['lexicon: attested form'] },
  ],
};

describe('formatBlocks', () => {
  it('marks an ambiguous block and lists every candidate', () => {
    const out = formatBlocks([block]);
    expect(out).toMatch(/rosa/);
    expect(out).toMatch(/\?/);
    expect(out).toMatch(/nom sg/);
    expect(out).toMatch(/abl sg/);
  });

  it('prints a resolved block without the ambiguity marker', () => {
    const resolved = { ...block, resolved: true, candidates: [block.candidates[0]] };
    expect(formatBlocks([resolved])).not.toMatch(/\?/);
  });

  it('reports an unknown word explicitly', () => {
    const unknown = { ...block, candidates: [], resolved: false };
    expect(formatBlocks([unknown])).toMatch(/not in lexicon/i);
  });
});
```

- [ ] **Step 2: Run it, verify it fails**

Run: `npx vitest run tests/cli.test.js`

- [ ] **Step 3: Implement**

Export `formatBlocks(blocks): string` as a pure function, and keep the file's `main()` behind `if (import.meta.url === pathToFileURL(process.argv[1]).href)` so importing it in a test does not run it. `main()` reads `data/manifest.json`, builds a lexicon whose `fetchShard` reads `data/forms/<name>.json` from disk, segments the argument text, and prints every sentence's blocks.

- [ ] **Step 4: Run it against real data**

```bash
npx vitest run tests/cli.test.js
npm run parse -- "Caesar in Galliam magnam cum legione venit."
```

Read the output critically. Expect `Galliam` accusative and resolved, `in` narrowed to accusative by its object, `cum` governing `legione` as ablative, and `Caesar` still ambiguous between nominative and vocative — which is correct, and is the app doing its job.

- [ ] **Step 5: Record findings and update the README**

Add a short "current state" section to `README.md` with the actual CLI output pasted in, and note any word that parsed wrongly as a known limitation. This output is what the UI plan renders as blocks.

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "feat: CLI harness printing candidate analyses per word"
```

---

## Self-Review

**Spec coverage.** §4 principle and cascade → Tasks 12–15. §5.1 offline build → Tasks 2, 4–8. §5.2 module table → Tasks 9–15. §10.1 sourcing → Task 2 provenance and `docs/DATA.md`. §11 testing → every task. §12 question 1 (index size) → Task 7 gate; question 3 (pt coverage) → Task 8 measurement. §12 question 2 (drag library) belongs to the UI plan.

**Deliberately out of this plan**, all belonging to the UI plan: §6 layout, §7 blocks, colour, layers, chunks, motion, §8 dictionary popup, §9 persistence and export, and the bundled sample passages. Task 2's `docs/DATA.md` and Task 16's README output are what carry context across the two plans.

**Known limitation to hand to the UI plan:** stage 2 narrows an adjective against any agreeing nominal in the sentence, not against its actual head. In a long period with several accusative feminine nouns this can leave the wrong pairing on screen. That is the reader's repin case, and it is why the reason string names the token it agreed with.
