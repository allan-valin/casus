"""Lithuanian (2026-10-21): keys without tone marks, and verb forms. Wiktionary gives full conjugation tables for
about 700 verbs and only the three principal parts (infinitive, present 3rd, past 3rd) for the other ~10,000; the
finite forms follow from those three. The generator is measured against every full table in the dump."""
import gzip
import json
import sys
from pathlib import Path

import pytest

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from casus_build.lt import strip_lt, table_forms, verb_forms  # noqa: E402

DUMP = Path(__file__).resolve().parents[2] / "vendor" / "wiktextract" / "kaikki.org-dictionary-Lithuanian.jsonl.gz"


def test_tone_marks_go_letters_stay():
    assert strip_lt("namai̇̃") == "namai"
    assert strip_lt("skaitýti") == "skaityti"
    assert strip_lt("namų̃") == "namų"
    assert strip_lt("nãmą") == "namą"
    assert strip_lt("Ėglė") == "ėglė"
    assert strip_lt("šuõ") == "šuo"
    assert strip_lt("žmonėms") == "žmonėms"


def _cells(forms):
    return {(f, a["tense"], a["mood"], a["person"], a["number"]) for f, a in forms}


def test_principal_parts_give_the_finite_forms():
    got = _cells(verb_forms("skaityti", "skaito", "skaitė"))
    for want in [("skaitau", "pres", "ind", "1", "sg"), ("skaitai", "pres", "ind", "2", "sg"), ("skaito", "pres", "ind", "3", "sg"),
                 ("skaitome", "pres", "ind", "1", "pl"), ("skaitote", "pres", "ind", "2", "pl"),
                 ("skaičiau", "past", "ind", "1", "sg"), ("skaitei", "past", "ind", "2", "sg"), ("skaitėme", "past", "ind", "1", "pl"),
                 ("skaitysiu", "fut", "ind", "1", "sg"), ("skaitys", "fut", "ind", "3", "sg"), ("skaitydavau", "impf", "ind", "1", "sg"),
                 ("skaityčiau", "pres", "cond", "1", "sg"), ("skaitytų", "pres", "cond", "3", "sg"), ("skaityk", "pres", "imp", "2", "sg"),
                 ("skaitykime", "pres", "imp", "1", "pl")]:
        assert want in got, want
    got = _cells(verb_forms("girdėti", "girdi", "girdėjo"))
    assert ("girdžiu", "pres", "ind", "1", "sg") in got and ("girdime", "pres", "ind", "1", "pl") in got
    assert ("girdėjau", "past", "ind", "1", "sg") in got
    got = _cells(verb_forms("nešti", "neša", "nešė"))
    assert ("nešiu", "fut", "ind", "1", "sg") in got and ("neš", "fut", "ind", "3", "sg") in got and ("nešiau", "past", "ind", "1", "sg") in got
    got = _cells(verb_forms("gerti", "geria", "gėrė"))
    assert ("geriu", "pres", "ind", "1", "sg") in got and ("geriame", "pres", "ind", "1", "pl") in got
    got = _cells(verb_forms("bėgti", "bėga", "bėgo"))
    assert ("bėk", "pres", "imp", "2", "sg") in got


def test_a_full_table_is_read_by_position():
    forms = ["skaitaũ", "skaitai̇̃", "skai̇̃to", "skai̇̃tome", "skai̇̃tom", "skai̇̃tote", "skai̇̃tot", "skai̇̃to"] + ["x"] * 45
    got = table_forms(forms)
    assert ("skaitaũ", "pres", "ind", "1", "sg") in _cells(got)
    assert ("skai̇̃tome", "pres", "ind", "1", "pl") in _cells(got)


@pytest.mark.skipif(not DUMP.exists(), reason="the Lithuanian dump is not downloaded")
def test_generator_agrees_with_the_full_tables():
    agree = total = 0
    for line in gzip.open(DUMP, "rt", encoding="utf-8"):
        d = json.loads(line)
        if d.get("pos") != "verb":
            continue
        forms = d.get("forms") or []
        table = [f["form"] for f in forms if "error-unrecognized-form" in (f.get("tags") or [])]
        p3 = next((f["form"] for f in forms if set(f.get("tags") or []) == {"present", "third-person"}), None)
        q3 = next((f["form"] for f in forms if set(f.get("tags") or []) == {"past", "third-person"}), None)
        if len(table) != 53 or not p3 or not q3 or d["word"].endswith("s"):
            continue
        want = {(strip_lt(f), *rest) for f, *rest in _cells(table_forms(table))}
        got = {(strip_lt(f), *rest) for f, *rest in _cells(verb_forms(d["word"], strip_lt(p3), strip_lt(q3)))}
        total += len(got)
        agree += len(got & want)
    assert total > 5000
    print(f"declension: {agree}/{total}")
    assert agree / total >= 0.95, f"{agree}/{total}"


def test_regular_declensions():
    from casus_build.lt import noun_forms
    got = {(f, a["case"], a["number"]) for f, a in noun_forms("paminklas", "m")}
    assert {("paminklo", "gen", "sg"), ("paminklų", "gen", "pl"), ("paminkluose", "loc", "pl"), ("paminklą", "acc", "sg")} <= got
    got = {(f, a["case"], a["number"]) for f, a in noun_forms("mintis", "f")}
    assert {("minties", "gen", "sg"), ("minčių", "gen", "pl"), ("mintį", "acc", "sg"), ("mintimi", "ins", "sg")} <= got
    got = {(f, a["case"], a["number"]) for f, a in noun_forms("gatvė", "f")}
    assert {("gatvės", "gen", "sg"), ("gatvių", "gen", "pl"), ("gatvėje", "loc", "sg")} <= got
    got = {(f, a["case"], a["number"]) for f, a in noun_forms("sūnus", "m")}
    assert {("sūnaus", "gen", "sg"), ("sūnumi", "ins", "sg")} <= got


@pytest.mark.skipif(not DUMP.exists(), reason="the Lithuanian dump is not downloaded")
def test_declension_agrees_with_the_tables():
    from casus_build.lt import noun_forms
    agree = total = 0
    for line in gzip.open(DUMP, "rt", encoding="utf-8"):
        d = json.loads(line)
        if d.get("pos") != "noun":
            continue
        forms = [f for f in d.get("forms") or [] if f.get("source") == "declension"]
        if len(forms) < 14:
            continue
        tags = {t for f in d.get("forms") or [] for t in f.get("tags") or []}
        gender = "m" if "masculine" in tags and "feminine" not in tags else "f" if "feminine" in tags and "masculine" not in tags else None
        want = {(strip_lt(f["form"]), c, n) for f in forms for c in ("nom", "gen", "dat", "acc", "ins", "loc", "voc")
                for n in ("sg", "pl") if {"nominative": "nom", "genitive": "gen", "dative": "dat", "accusative": "acc",
                "instrumental": "ins", "locative": "loc", "vocative": "voc"}.get(next((t for t in f["tags"] if t.endswith("ive")), ""), "") == c
                and ("singular" if n == "sg" else "plural") in f["tags"]}
        if " " in d["word"]:
            continue                      # multiword terms are not read as one word
        have = {(c, n) for _, c, n in want}
        got = {(f, a["case"], a["number"]) for f, a in noun_forms(d["word"], gender) if (a["case"], a["number"]) in have}
        if got:
            total += len(got)
            agree += len(got & want)
    assert total > 20000
    print(f"declension: {agree}/{total}")
    assert agree / total >= 0.95, f"{agree}/{total}"
