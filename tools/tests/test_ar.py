"""Arabic data (overnight plan 2026-10-19)."""
import json
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from casus_build.ar.normalize import strip_ar  # noqa: E402
from casus_build.ar.parse import parse_entries, build_index  # noqa: E402
from casus_build.ar.codes import encode_analysis, decode_analysis  # noqa: E402


def test_strip_drops_vowel_marks_and_folds_alif_and_final_ya():
    assert strip_ar("الْكِتَابُ") == "الكتاب"
    assert strip_ar("أَكْتُبُ") == "اكتب" and strip_ar("إِلَى") == "الي" and strip_ar("قُرْآن") == "قران"
    assert strip_ar("كـتـاب") == "كتاب"                      # tatweel


def entry(word, pos, forms, gloss="x", head="", ipa=None):
    return json.dumps({"word": word, "lang_code": "ar", "pos": pos, "head_templates": [{"expansion": head}], "forms": forms,
                       "senses": [{"glosses": [gloss]}], "sounds": [{"ipa": ipa}] if ipa else []}, ensure_ascii=False)


def test_noun_forms_with_case_state_number():
    lines = [entry("كتاب", "noun", [
        {"form": "كِتَاب", "tags": ["canonical", "masculine"]}, {"form": "kitāb", "tags": ["romanization"]},
        {"form": "كُتُب", "tags": ["plural"]},
        {"form": "الْكِتَابُ", "tags": ["definite", "nominative", "singular", "triptote"]},
        {"form": "كِتَابًا", "tags": ["accusative", "indefinite", "singular", "triptote"]},
        {"form": "الْكِتَاب", "tags": ["definite", "informal", "singular", "triptote"]}], "book", "كِتَاب • (kitāb) m (plural كُتُب (kutub))", "/ki.taːb/")]
    e = list(parse_entries(lines))[0]
    assert e["headword"] == "كِتَاب" and e["gender"] == "m" and e["plural"] == "كُتُب"
    index = build_index([e])
    assert {"lemma": e["id"], "pos": "noun", "case": "nom", "number": "sg", "gender": "m", "state": "def"} in index["الْكِتَابُ"]
    assert {"lemma": e["id"], "pos": "noun", "case": "acc", "number": "sg", "gender": "m", "state": "indef"} in index["كِتَابًا"]
    assert "الْكِتَاب" not in index                       # informal (pausal) cells are left out
    assert "kitāb" not in index


def test_verb_forms():
    lines = [entry("كتب", "verb", [
        {"form": "كَتَبَ", "tags": ["canonical", "form-i"]},
        {"form": "يَكْتُبُ", "tags": ["active", "imperfective", "indicative", "masculine", "non-past", "singular", "third-person"]},
        {"form": "كَتَبْتُ", "tags": ["active", "first-person", "masculine", "past", "perfective", "singular"]},
        {"form": "اُكْتُبْ", "tags": ["active", "imperative", "masculine", "second-person", "singular"]}], "to write", "كَتَبَ • (kataba) I")]
    e = list(parse_entries(lines))[0]
    index = build_index([e])
    assert {"lemma": e["id"], "pos": "verb", "person": "3", "number": "sg", "gender": "m", "tense": "npast", "mood": "ind", "voice": "act"} in index["يَكْتُبُ"]
    assert {"lemma": e["id"], "pos": "verb", "person": "1", "number": "sg", "gender": "m", "tense": "past", "mood": "ind", "voice": "act"} in index["كَتَبْتُ"]
    assert {"lemma": e["id"], "pos": "verb", "person": "2", "number": "sg", "gender": "m", "tense": "npast", "mood": "imp", "voice": "act"} in index["اُكْتُبْ"]


def test_codes_round_trip():
    for a in ({"pos": "noun", "case": "gen", "number": "du", "gender": "f", "state": "cons"},
              {"pos": "verb", "person": "2", "number": "pl", "gender": "f", "tense": "npast", "mood": "subj", "voice": "pass"},
              {"pos": "prep"}, {"pos": "particle"}):
        assert decode_analysis(encode_analysis(a), "5") == {"lemma": "5", **a}
