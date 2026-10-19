"""Paradigm tables for Learn lessons written for Casus, generated from the reader's own paradigm data
(data/<code>/paradigms/, from Wiktionary) instead of typed by hand — accents and endings come from the source.
A cell with several forms (Wiktionary lists dialect forms too: γένους, γένεος, γένευς) shows the one the
language's sentences use most, else the shortest (usually the contracted Attic form)."""
from __future__ import annotations

import json
import re
from pathlib import Path

CASES = ["nom", "gen", "dat", "acc", "ins", "abl", "loc", "pre", "voc"]
# Finnish (and the Uralic order generally): the grammatical cases, then the inner and outer local cases, then the rest
CASES_FI = ["nom", "gen", "par", "acc", "ine", "ela", "ill", "ade", "abl", "all", "ess", "tra", "abe"]   # (instructive, comitative: rare, in the lessons text)
CASE_NAME = {"nom": ("nominative", "nominativo"), "gen": ("genitive", "genitivo"), "dat": ("dative", "dativo"), "acc": ("accusative", "acusativo"),
             "abl": ("ablative", "ablativo"), "loc": ("locative", "locativo"), "ins": ("instrumental", "instrumental"), "pre": ("prepositional", "preposicional"), "voc": ("vocative", "vocativo"),
             "par": ("partitive", "partitivo"), "ine": ("inessive", "inessivo"), "ela": ("elative", "elativo"), "ill": ("illative", "ilativo"),
             "ade": ("adessive", "adessivo"), "all": ("allative", "alativo"), "ess": ("essive", "essivo"), "tra": ("translative", "translativo"),
             "abe": ("abessive", "abessivo"), "com": ("comitative", "comitativo")}
NUM_NAME = {"sg": ("singular", "singular"), "pl": ("plural", "plural"), "du": ("dual", "dual")}
GEN_NAME = {"m": ("masculine", "masculino"), "f": ("feminine", "feminino"), "n": ("neuter", "neutro")}
PERSON_NAME = {"1": ("1st person", "1ª pessoa"), "2": ("2nd person", "2ª pessoa"), "3": ("3rd person", "3ª pessoa")}


def _both(pair):
    return {"en": pair[0], "pt": pair[1]}


def _rows(data: Path, word: str, pos: str):
    codes = json.loads((data / "codes.json").read_text(encoding="utf-8"))
    lemmas = json.loads((data / "lemmas.json").read_text(encoding="utf-8"))
    bare = lambda w: re.sub(r"[\u0300\u0301]", "", __import__("unicodedata").normalize("NFD", w))   # noqa: E731  (Russian headwords carry stress marks)
    lid = next(k for k, v in lemmas.items() if bare(v["headword"]) == bare(word) and v.get("pos") == pos)
    raw = json.loads((data / "paradigms" / f"{int(lid) % 512}.json").read_text(encoding="utf-8"))[lid]
    out, prev = [], None
    for row in raw:
        if prev is not None and isinstance(row[0], int):
            form, cs = prev[: row[0]] + row[1], row[2:]
        else:
            form, cs = row[0], row[1:]
        prev = form
        for c in cs:
            p = codes["POS"].get(c[0])
            feats = codes["LAYOUT"].get(p, [])
            a = {"pos": p, **{f: codes["TABLES"][f].get(c[k + 1]) for k, f in enumerate(feats) if k + 1 < len(c)}}
            out.append((form, a))
    return out


def paradigm_table(data: Path, spec: dict, attested: dict | None = None, final_sigma: bool = False, exclude: str | None = None) -> dict:
    """{head: {en, pt}, rows: [[label {en, pt}, cell…]]} for a noun (case × number), an adjective or pronoun (case ×
    gender, in one number) or a verb (person × number, in one tense, mood and voice)"""
    attested = attested or {}
    forms = _rows(Path(data), spec["word"], spec["pos"])
    if exclude:
        # (Finnish: the data files possessive forms — taloomme — under the plain cases)
        forms = [(f, a) for f, a in forms if not re.search(exclude, f)]
    fix = (lambda w: re.sub(r"σ\b", "ς", w)) if final_sigma else (lambda w: w)   # noqa: E731

    import unicodedata
    first = lambda w: unicodedata.normalize("NFD", w)[:1].lower()   # noqa: E731
    lemma_first = first(spec["word"])
    past = spec.get("pos") == "verb" and spec.get("tense") in ("impf", "aor", "plup") and spec.get("mood") == "ind"

    overrides = {tuple(k.split()): v for k, v in (spec.get("override") or {}).items()}   # "3 pl": form the data gets wrong

    def pick(cond):
        key_ = (cond.get("person"), cond.get("number"))
        if key_ in overrides:
            return overrides[key_]
        # a past indicative prefers its augmented form (ἔλυσα, not Homer's λῦσα); then the shortest (the contracted
        # Attic γένη, not γένεα; αὐτό, not a longer form listed beside it); then the one the texts use most
        key = lambda w: ((first(w) == lemma_first) if past else 0, len(w), -attested.get(w, 0), w)   # noqa: E731
        cands = sorted({fix(f) for f, a in forms if all(a.get(k) == v for k, v in cond.items())}, key=key)
        return cands[0] if cands else None

    pos = spec["pos"]
    if pos == "verb":
        base = {k: spec[k] for k in ("tense", "mood", "voice") if k in spec}
        cols = ["sg", "pl"]
        rows = []
        for p in ("1", "2", "3"):
            cells = [pick({**base, "person": p, "number": n}) for n in cols]
            if any(cells):
                rows.append([_both(PERSON_NAME[p]), *[c or "—" for c in cells]])
        return {"head": {"en": ["", *[NUM_NAME[n][0] for n in cols]], "pt": ["", *[NUM_NAME[n][1] for n in cols]]}, "rows": rows}
    # a language without gender (Finnish): adjectives and pronouns are laid out like nouns, case × number
    genderless = not any(a.get("gender") in ("m", "f", "n") for _, a in forms)
    finnish = any(a.get("case") == "par" for _, a in forms)
    if pos == "noun" or genderless:
        cols = [n for n in ("sg", "du", "pl") if any(a.get("number") == n for _, a in forms)]   # (Sanskrit, Greek: the dual)
        cond = lambda c, n: {"case": c, "number": n}   # noqa: E731
    else:
        number = spec.get("number", "sg")
        cols = [g for g in ("m", "f", "n") if any(a.get("gender") == g for _, a in forms)]
        # Russian marks gender only in the singular (number "x") and has one plural for all: m, f, n, plural
        genderless_plural = number == "sg" and any(a.get("number") == "x" and a.get("gender") in ("m", "f", "n") for _, a in forms)
        if genderless_plural and any(a.get("number") == "p" or a.get("number") == "pl" for _, a in forms):
            cols = cols + ["pl"]
        deg = {"degree": spec["degree"]} if "degree" in spec else {}

        def cond(c, g):
            if g == "pl":
                return {"case": c, "number": "pl", **deg}
            return {"case": c, "number": "x" if genderless_plural else number, "gender": g, **deg}
    names = NUM_NAME if pos == "noun" or genderless else {**GEN_NAME, "pl": NUM_NAME["pl"]}
    rows = []
    for c in (CASES_FI if finnish else CASES):
        if c == "voc" and pos in ("pron", "det"):
            continue                                          # pronouns and articles are not called
        cells = [pick(cond(c, x)) for x in cols]
        if any(cells):
            rows.append([_both(CASE_NAME[c]), *[x or "—" for x in cells]])
    return {"head": {"en": ["", *[names[x][0] for x in cols]], "pt": ["", *[names[x][1] for x in cols]]}, "rows": rows}
