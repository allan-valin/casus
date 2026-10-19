"""Icelandic inflection from BÍN, the Database of Modern Icelandic Inflection (Árni Magnússon Institute for Icelandic
Studies, CC BY-SA 4.0; vendor/bin/SHsnid.csv.zip, the Sigrúnarsnið format: lemma;id;class;domain;form;tag). Wiktionary's
Icelandic tables give verbs their principal parts only (las, lásu); BÍN has every form (les, lest, lesum…)."""
from __future__ import annotations

import io
import re
import zipfile
from collections.abc import Iterable, Iterator

GENDER_CLASS = {"kk": "m", "kvk": "f", "hk": "n"}
POS = {"kk": "noun", "kvk": "noun", "hk": "noun", "lo": "adj", "so": "verb", "fn": "pron", "pfn": "pron", "gr": "det", "to": "num"}
CASE = {"NF": "nom", "ÞF": "acc", "ÞGF": "dat", "EF": "gen"}
NUM = {"ET": "sg", "FT": "pl"}
GEN = {"KK": "m", "KVK": "f", "HK": "n"}
_NOMINAL = re.compile(r"(NF|ÞF|ÞGF|EF)(ET|FT)")


def bin_analysis(cls: str, tag: str) -> dict | None:
    pos = POS.get(cls)
    if not pos:
        return None
    if pos == "verb":
        parts = tag.split("-")
        if "FH" not in parts and "VH" not in parts:
            return None                                # infinitive, imperative, participles: the dictionary form is enough
        person = next((p[0] for p in parts if p in ("1P", "2P", "3P")), None)
        number = next((NUM[p] for p in parts if p in NUM), None)
        tense = "pres" if "NT" in parts else "past" if "ÞT" in parts else None
        if not (person and number and tense):
            return None
        out = {"pos": "verb", "person": person, "number": number, "tense": tense, "mood": "ind" if "FH" in parts else "subj"}
        if "MM" in parts:
            out["voice"] = "pass"
        return out
    m = _NOMINAL.search(tag)
    if not m:
        return None
    out = {"pos": pos, "case": CASE[m.group(1)], "number": NUM[m.group(2)]}
    gender = GENDER_CLASS.get(cls) or next((GEN[g] for g in tag.split("-") if g in GEN), None)
    if gender:
        out["gender"] = gender
    return out


def read_bin(path) -> Iterator[tuple[str, str, str, str]]:
    """(lemma, class, form, tag) for the general vocabulary (domain alm)"""
    with zipfile.ZipFile(path) as z, z.open("SHsnid.csv") as raw:
        for line in io.TextIOWrapper(raw, encoding="utf-8"):
            p = line.rstrip("\n").split(";")
            if len(p) == 6 and p[3] == "alm":
                yield p[0], p[2], p[4], p[5]


def merge_bin(entries: list[dict], rows, frequent: set, start_id: int) -> list[dict]:
    """BÍN's forms added to the Wiktionary entry of the same lemma and part of speech; a BÍN lemma Wiktionary lacks is
    added (no English gloss) when one of its forms is in the frequency list. `rows` is a function giving the rows, read
    twice so the 300,000 BÍN lemmas are never all held at once."""
    by_key = {(e["headword"].lower(), e["pos"]): e for e in entries}
    wanted = {(lemma.lower(), POS.get(cls)) for lemma, cls, form, tag in rows() if form.lower() in frequent and POS.get(cls)} - set(by_key)
    extra: dict[tuple, dict] = {}
    for lemma, cls, form, tag in rows():
        a = bin_analysis(cls, tag)
        if not a:
            continue
        key = (lemma.lower(), a["pos"])
        e = by_key.get(key)
        if e is None:
            if key not in wanted:
                continue
            e = extra.get(key)
            if e is None:
                e = extra[key] = {"id": None, "headword": lemma, "pos": a["pos"], "gender": GENDER_CLASS.get(cls), "cells": [], "gloss_en": "", "ipa": []}
        # nothing a cell already there says more precisely (Wiktionary's hún has its gender, BÍN's not)
        if not any(f == form and all(b.get(k) == v for k, v in a.items()) for f, b in e["cells"]):
            e["cells"].append((form, a))
    added = list(extra.values())
    for k, e in enumerate(added):
        e["id"] = start_id + k
    return entries + added
