# Whitaker's WORDS data — the layout the build reads

Both files were fetched on 2026-08-20 from `https://github.com/mk270/whitakers-words`
(`DICTLINE.GEN`, `INFLECTS.LAT`, at the repository root, branch `master`) by
`tools/fetch_data.sh`. Everything below was **measured on those files** on
2026-10-02, not copied from a description: column spans were checked over all
39,335 dictionary lines and 1,797 inflection rules. Encoding is Latin-1.

## DICTLINE.GEN — one lemma per line, fixed columns

39,335 lines, 113–190 characters each.

| columns (0-based, half-open) | field | notes |
|---|---|---|
| 0–19, 19–38, 38–57, 57–76 | stems 1–4 | left-justified, space-padded; `zzz` = no such stem |
| 76–83 | part of speech | `N ADJ V ADV NUM INTERJ CONJ PREP PACK PRON` |
| 83–100 | class codes | whitespace-separated, shape depends on the part of speech (below) |
| 100 | age | see codes |
| 102 | area | subject area (ignored) |
| 104 | geography | (ignored) |
| 106 | frequency | see codes |
| 108 | source | dictionary the entry came from (ignored) |
| 110– | English gloss | `;`-separated senses; a leading `|` marks a continuation line of the previous entry |

Class codes by part of speech (the 83–100 span, split on whitespace):

| pos | fields | example |
|---|---|---|
| `N` | declension, variant, gender (`M F N C X`), kind (`T P S …`, ignored) | `1 1 F T` |
| `ADJ` | declension, variant, comparison (`POS COMP SUPER X`) | `1 1 POS` |
| `V` | conjugation, variant, kind (`TRANS INTRANS DEP SEMIDEP IMPERS X …`) | `3 1 TRANS` |
| `PRON` | declension, variant, kind | `1 0 INDEF` |
| `NUM` | declension, variant, sort (`CARD ORD DIST ADVERB`), value | `1 2 CARD 0` |
| `PACK` | declension, variant, kind — packons, `qu-` words with an enclitic baked in | `1 0 REL` |
| `ADV` | comparison | `POS` |
| `PREP` | the case governed (`ABL ACC GEN`) | `ABL` |
| `CONJ`, `INTERJ` | none | |

**Conjugation numbering is not the schoolbook one.** Measured on the 7,791 verbs:

| Whitaker | means | example line |
|---|---|---|
| `V 1 *` | 1st conjugation | `am am amav amat V 1 1` |
| `V 2 *` | 2nd | |
| `V 3 1`–`3 3` | 3rd; **3rd `-iō` when stem 1 ends in `i` and stem 2 does not** (333 lemmas) | `capi cap cep capt V 3 1` (capiō) vs `reg reg rex rect V 3 1` (regō) |
| `V 3 4` | **4th** conjugation | `audi aud audiv audit V 3 4` |
| `V 5` | *sum* and compounds | |
| `V 6` | *eō* and compounds | |
| `V 7` | *volō*, *ferō* and the like | |
| `V 8` | defective and archaic | `am am amass zzz V 8 1` |
| `V 9` | undeclined | |

There is no `V 4` in the file.

Age codes (column 100): `X` unknown, `A` archaic, `B` early, `C` classical, `D` late,
`E` later, `F` medieval, `G` scholar/neo-Latin, `H` modern. Frequency (column 106):
`A` very frequent … `F` very rare, `I` inscriptions, `N` Pliny only, `X` unknown.

Declension 9 (`N 9 8`, `N 9 9`, `ADJ 9 9`, `V 9 9`) means abbreviations and undeclined
words; their single inflection rule has an empty ending.

## INFLECTS.LAT — one rule per line, whitespace-separated

3,228 lines: 1,797 rules, the rest blank or comments. A comment line starts with `--`
after optional indentation (97 are indented), and 134 rules carry a trailing `--`
comment that must be cut off before splitting.

Common tail of every rule: `stem_key ending_length ending age frequency`. When
`ending_length` is `0` the ending field is absent (10 fields instead of 11 for a noun),
and the form is the bare stem. `stem_key` is 1–4 and names which DICTLINE stem the
ending attaches to.

| pos | fields before the common tail | example |
|---|---|---|
| `N` | decl, variant, case, number, gender | `N 1 1 ACC S C 2 2 am X A` |
| `ADJ` | decl, variant, case, number, gender, comparison | `ADJ 1 1 NOM S M POS 1 2 us X A` |
| `V` | conj, variant, tense, voice, mood, person, number | `V 1 1 PRES ACTIVE IND 1 S 1 1 o X A` |
| `VPAR` | conj, variant, case, number, gender, tense, voice, `PPL` | `VPAR 1 0 NOM S X PRES ACTIVE PPL 1 3 ans X A` |
| `SUPINE` | `0 0`, case, number, gender | `SUPINE 0 0 ACC S N 4 2 um X A` |
| `PRON` | decl, variant, case, number, gender | `PRON 1 0 GEN S X 2 3 jus X A` |
| `NUM` | decl, variant, case, number, gender, sort | `NUM 1 1 NOM S M CARD 1 2 us X A` |
| `ADV` | comparison | `ADV POS 1 0 X A` |
| `PREP` | case governed | `PREP ABL 1 0 X A` |
| `CONJ`, `INTERJ` | none | `CONJ 1 0 X A` |

Codes: case `NOM VOC GEN LOC DAT ABL ACC X`; number `S P X`; gender `M F N C X`
(`C` = common, i.e. masculine or feminine; `X` = any); tense `PRES IMPF FUT PERF PLUP FUTP`;
voice `ACTIVE PASSIVE`; mood `IND SUB IMP INF PPL`; person `0 1 2 3`.

**Matching a rule to a lemma.** A rule's `variant 0` applies to every variant of that
declension (`N 1 0 NOM P C 2 2 ae` serves all 1st-declension nouns); `0 0` applies to every
class (the perfect system is `V 0 0 PERF ACTIVE IND 1 S 3 1 i`, the comparatives are
`ADJ 0 0 … COMP`). A rule's gender must be compatible with the lemma's: equal, or the rule
says `X`, or the rule says `C` and the lemma is `M`, `F` or `C`.

Rules spell endings with `j` and `v` (`jus`, `vi`); the build normalises them to `i`/`u`.

## Fixtures

`tools/tests/fixtures/dictline_sample.txt` — the lemmas whose first stem is one of
`ros serv urbs magn capi am reg puell bell domin audi bon et in cum ab hic un cur heu unus aliqu`
(`ab` kept only as the preposition). Covers:

- 1st-declension feminine noun: `ros ros N 1 1 F` (rosa)
- 2nd-declension masculine noun: `serv serv N 2 1 M` (servus), `domin domin N 2 1 M`
- 3rd-declension noun: `urbs urb N 3 3 F` (urbs — Whitaker spells stem 1 as the nominative for 3rd-declension nouns), `ros ror N 3 1 M` (ros, roris)
- adjective: `magn magn maj maxi ADJ 1 1 X`, `bon bon meli opti ADJ 1 1 X`
- 1st-conjugation verb: `am am amav amat V 1 1`
- 3rd-conjugation `-iō` verb: `capi cap cep capt V 3 1`
- plain 3rd: `reg reg rex rect V 3 1`; 4th: `audi aud audiv audit V 3 4`
- preposition `in` (two lines, `ACC` and `ABL`), `cum`, `ab`; conjunction `et`;
  interjection `heu`; pronoun `hic`; numeral `unus`; adverb `cur`.

`tools/tests/fixtures/inflects_sample.txt` — every rule for `N 1 0/1`, `N 2 0/1/2`,
`N 3 0/1/3`, `N 9 8/9`, `ADJ 1 0/1`, `ADJ 0 0`, `V 1 1`, `V 3 0/1/4`, `V 0 0`, the
nominative `VPAR 1 0` and `VPAR 3 0` rules, and the `PREP`, `CONJ`, `INTERJ` rules; no
comment lines.

## Measurements

Expansion (Task 6, 2026-10-02), over 38,099 merged lemmas and 1,797 rules, in 21 s:

| | |
|---|---|
| distinct normalised forms | 1,204,524 |
| analyses | 2,290,362 |
| by part of speech | vpar 850,224 · verb 768,100 · noun 348,609 · adj 296,095 · supine 12,248 · adv 9,441 · num 3,009 · pron 2,344 · interj 106 · conj 99 · prep 87 |
| most analyses on one form | `quis`, 215 |

Participles are a third of everything: every verb meets 346 `VPAR` rules.

### The size gate (Task 7, 2026-10-02) — FAILED as first written

Plain JSON, spelled-out keys (`{"lemma":"ros:noun:33803","pos":"noun","case":"nom",...}`),
sharded by the first two letters, `python tools/build_index.py` in 29 s:

| | measured | budget |
|---|---|---|
| `data/` on disk | **274 MB** (forms + lemmas 284 MB as written) | 25 MB |
| shards | 239; median 271 KB; 17 over 3 MB | |
| `co.json` gzipped (the largest: 147,241 forms) | **1.50 MB** | 300 KB |
| `in.json` gzipped (68,330 forms) | 670 KB | 300 KB |
| `pr.json` gzipped | 478 KB | 300 KB |
| `ab.json` gzipped | 136 KB | 300 KB |
| `lemmas.json` / `glosses.en.json` | 5.0 MB / 2.5 MB | |

About 124 bytes per analysis, most of it key names and the lemma id string
repeated on every row. Over budget by an order of magnitude, so `data/` is
not committed (`.gitignore`). The options the plan names, in the order they
are worth trying: shorter keys and integer lemma ids; a coarser-to-finer
shard split so `co`/`de`/`in` stop being one file; dropping rare analyses
behind a flag; and last, the stem+ending engine port.
