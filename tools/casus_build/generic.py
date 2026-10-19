"""A generic Wiktextract parser for the case languages still to come (overnight 2026-10-19: Finnish, Czech, Polish,
Turkish, Hungarian, Icelandic, Modern Greek, Sanskrit), configured per language by its list of cases. Nominals by case,
number and gender; verbs by person, number, tense and mood; multiword cells, romanisation and form-of entries left out.
Codes are generated from the configuration (CODES_JSON per language)."""
from __future__ import annotations

import json
import re
import string
from collections.abc import Iterable, Iterator

POS = {"noun": "noun", "name": "noun", "adj": "adj", "verb": "verb", "pron": "pron", "det": "det", "num": "num", "adv": "adv",
       "prep": "prep", "postp": "prep", "conj": "conj", "particle": "particle", "intj": "interj", "article": "det"}
NUMBERS = {"singular": "sg", "plural": "pl", "dual": "du"}
GENDERS = {"masculine": "m", "feminine": "f", "neuter": "n"}
PERSONS = {"first-person": "1", "second-person": "2", "third-person": "3"}
TENSES = {"present": "pres", "past": "past", "future": "fut", "imperfect": "impf", "aorist": "aor", "perfect": "perf", "preterite": "past"}
MOODS = {"indicative": "ind", "conditional": "cond", "imperative": "imp", "subjunctive": "subj", "potential": "pot", "optative": "opt"}
SKIP = {"romanization", "table-tags", "inflection-template", "multiword-construction", "diminutive", "augmentative", "class",
        "comparative", "superlative", "dated", "obsolete", "archaic", "alternative", "canonical", "error-unrecognized-form",
        "connegative", "participle", "infinitive", "possessive", "dialectal", "rare"}


class Config:
    def __init__(self, code: str, cases: list[str], case_tags: dict[str, str], script: str = r"\p{L}"):
        self.code = code
        self.cases = cases                       # our case ids, in the language's school order
        self.case_tags = case_tags               # wiktextract tag -> case id
        self.letters = re.compile(r"[^\W\d_]")


def _one(tags, table):
    hits = [v for k, v in table.items() if k in tags]
    return hits[0] if len(hits) == 1 else None


def analysis(cfg: Config, pos: str, tags: set, gender: str | None) -> dict | None:
    if pos in ("noun", "adj", "pron", "det", "num"):
        cases = [v for k, v in cfg.case_tags.items() if k in tags]
        if len(set(cases)) != 1:
            return None
        return {"pos": pos, "case": cases[0], "number": _one(tags, NUMBERS) or ("sg" if pos == "noun" else None),
                "gender": _one(tags, GENDERS) or (gender if pos == "noun" else None)}
    if pos == "verb":
        person, number = _one(tags, PERSONS), _one(tags, NUMBERS)
        if not person or not number or "negative" in tags or "passive" in tags:
            return None
        return {"pos": "verb", "person": person, "number": number, "tense": _one(tags, TENSES) or "pres", "mood": _one(tags, MOODS) or "ind"}
    return None


def parse_entries(cfg: Config, lines: Iterable[str]) -> Iterator[dict]:
    for i, line in enumerate(lines):
        line = line.strip()
        if not line:
            continue
        d = json.loads(line)
        pos = POS.get(d.get("pos", ""))
        word = (d.get("word") or "").strip()
        if not pos or not word or " " in word or d.get("pos") == "name":
            continue
        senses = d.get("senses") or []
        if senses and all(set(x.get("tags") or []) & {"form-of", "alt-of"} for x in senses):
            continue
        gender = next((v for k, v in GENDERS.items() if any(k in (s.get("tags") or []) for s in senses)), None)
        cells = []
        for f in d.get("forms") or []:
            tags = set(f.get("tags") or [])
            text = (f.get("form") or "").strip()
            # a key must be a word: it starts with a letter and has no slash (an IPA cell filed as a form once tried to
            # become the shard "/ˈ", a path outside the data folder)
            if not text or " " in text or tags & SKIP or not cfg.letters.match(text) or "/" in text or "\\" in text:
                continue
            a = analysis(cfg, pos, tags, gender)
            if a:
                cells.append((text, a))
        if pos in ("verb",) and not any(t == word for t, _ in cells):
            cells.append((word, {"pos": "verb", "mood": "inf"}))
        gloss = "; ".join(dict.fromkeys(" ".join(g.split()) for s in senses for g in (s.get("glosses") or [])[:1] if g))
        if not gloss:
            continue
        ipa = [{"ipa": s["ipa"], "tags": list(s.get("tags") or [])} for s in d.get("sounds") or [] if s.get("ipa")]
        yield {"id": i, "headword": word, "pos": pos, "gender": gender, "cells": cells, "gloss_en": gloss, "ipa": ipa[:3]}


def build_index(entries: list[dict]) -> dict[str, list[dict]]:
    index: dict[str, list[dict]] = {}
    for e in entries:
        base = {"lemma": e["id"], "pos": e["pos"]}
        for text, a in (e["cells"] or [(e["headword"], {"pos": e["pos"]})]):
            full = {**base, **{k: v for k, v in a.items() if k != "pos" and v is not None}}
            rows = index.setdefault(text.lower(), [])
            if full not in rows:
                rows.append(full)
    return index


def codes(cfg: Config):
    case = {c: ch for c, ch in zip(cfg.cases, string.ascii_letters)}
    case.update({"x": "_", None: "_"})
    number = {"sg": "s", "pl": "p", "du": "d", "x": "_", None: "_"}
    gender = {"m": "m", "f": "f", "n": "n", "x": "_", None: "_"}
    person = {"1": "1", "2": "2", "3": "3", "x": "_", None: "_"}
    tense = {"pres": "p", "past": "r", "fut": "f", "impf": "i", "aor": "a", "perf": "e", "x": "_", None: "_"}
    mood = {"ind": "i", "cond": "c", "imp": "m", "subj": "s", "pot": "o", "opt": "t", "inf": "n", "x": "_", None: "_"}
    pos_codes = {"noun": "n", "adj": "a", "verb": "v", "pron": "o", "det": "t", "num": "m", "adv": "d", "prep": "r", "conj": "c", "particle": "k", "interj": "j"}
    nominal = (("case", case), ("number", number), ("gender", gender))
    layout = {p: nominal for p in ("noun", "adj", "pron", "det", "num")}
    layout.update({"verb": (("person", person), ("number", number), ("tense", tense), ("mood", mood)), "adv": (), "prep": (), "conj": (), "particle": (), "interj": ()})
    back = {name: {v: k for k, v in t.items() if k is not None} for lay in layout.values() for name, t in lay}

    def encode(a: dict) -> str:
        return pos_codes[a["pos"]] + "".join(t[a.get(n)] for n, t in layout[a["pos"]])

    def decode(code: str, lemma: str) -> dict:
        pos = {v: k for k, v in pos_codes.items()}[code[0]]
        out = {"lemma": lemma, "pos": pos}
        for (n, _t), ch in zip(layout[pos], code[1:]):
            v = back[n][ch]
            if v != "x":
                out[n] = v
        return out

    json_ = {"POS": {v: k for k, v in pos_codes.items()},
             "TABLES": {n: {v: k for k, v in t.items() if k is not None} for n, t in (("case", case), ("number", number), ("gender", gender), ("person", person), ("tense", tense), ("mood", mood))},
             "LAYOUT": {p: [n for n, _t in lay] for p, lay in layout.items()}}
    return encode, decode, json_


FINNISH = Config("fi", ["nom", "gen", "par", "acc", "ine", "ela", "ill", "ade", "abl", "all", "ess", "tra", "ins", "abe", "com"],
                 {"nominative": "nom", "genitive": "gen", "partitive": "par", "accusative": "acc", "inessive": "ine", "elative": "ela",
                  "illative": "ill", "adessive": "ade", "ablative": "abl", "allative": "all", "essive": "ess", "translative": "tra",
                  "instructive": "ins", "abessive": "abe", "comitative": "com"})
CONFIGS = {"fi": FINNISH}
