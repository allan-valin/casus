"""Languages plan Task 11: Greek compact codes round-trip."""
from casus_build.grc.codes import encode_analysis, decode_analysis, CODES_JSON

SAMPLES = [
    {"pos": "noun", "case": "gen", "number": "du", "gender": "m"},
    {"pos": "det", "case": "dat", "number": "pl", "gender": "f"},
    {"pos": "adj", "case": "acc", "number": "sg", "gender": "n", "degree": "comp"},
    {"pos": "verb", "person": "3", "number": "sg", "tense": "aor", "mood": "opt", "voice": "mp"},
    {"pos": "vpar", "case": "nom", "number": "sg", "gender": "m", "tense": "pres", "voice": "act"},
    {"pos": "prep", "governs": "dat"},
    {"pos": "particle"},
]


def test_round_trip():
    for a in SAMPLES:
        assert decode_analysis(encode_analysis(a), "7") == {"lemma": "7", **a}


def test_the_js_table_export_has_every_pos():
    assert set(CODES_JSON["POS"].values()) >= {"noun", "adj", "verb", "vpar", "det", "pron", "num", "adv", "prep", "conj", "particle", "interj"}
