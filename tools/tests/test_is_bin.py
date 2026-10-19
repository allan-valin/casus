import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from casus_build.is_bin import bin_analysis, merge_bin  # noqa: E402


def test_bin_tags_become_analyses():
    assert bin_analysis("so", "GM-FH-NT-3P-ET") == {"pos": "verb", "person": "3", "number": "sg", "tense": "pres", "mood": "ind"}
    assert bin_analysis("so", "MM-FH-ÞT-1P-FT") == {"pos": "verb", "person": "1", "number": "pl", "tense": "past", "mood": "ind", "voice": "pass"}
    assert bin_analysis("kvk", "ÞFETgr") == {"pos": "noun", "case": "acc", "number": "sg", "gender": "f"}
    assert bin_analysis("lo", "FSB-KK-NFET") == {"pos": "adj", "case": "nom", "number": "sg", "gender": "m"}
    assert bin_analysis("pfn", "NFET") == {"pos": "pron", "case": "nom", "number": "sg"}
    assert bin_analysis("so", "GM-NH") is None


def test_merge_adds_bins_forms_to_the_matching_entry_and_frequent_words_wiktionary_lacks():
    rows = [("lesa", "so", "les", "GM-FH-NT-3P-ET"), ("lesa", "so", "lesum", "GM-FH-NT-1P-FT"),
            ("búa", "so", "bý", "GM-FH-NT-1P-ET"), ("sjaldgæfur", "lo", "sjaldgæfur", "FSB-KK-NFET")]
    entries = [{"id": 1, "headword": "lesa", "pos": "verb", "cells": [("las", {"pos": "verb"})], "gloss_en": "to read"}]
    out = merge_bin(entries, lambda: rows, frequent={"bý"}, start_id=100)
    assert ("les", {"pos": "verb", "person": "3", "number": "sg", "tense": "pres", "mood": "ind"}) in out[0]["cells"]
    added = [e for e in out if e["id"] >= 100]
    assert [(e["headword"], e["pos"]) for e in added] == [("búa", "verb")] and added[0]["gloss_en"] == ""


def test_a_bin_cell_that_says_less_than_one_already_there_is_not_added():
    entries = [{"id": 1, "headword": "hún", "pos": "pron", "cells": [("hún", {"pos": "pron", "case": "nom", "number": "sg", "gender": "f"})], "gloss_en": "she"}]
    out = merge_bin(entries, lambda: [("hún", "pfn", "hún", "NFET")], frequent=set(), start_id=9)
    assert len(out[0]["cells"]) == 1
