import json
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from casus_build.mk.parse import parse_entries, build_index  # noqa: E402
from casus_build.mk.codes import encode_analysis, decode_analysis  # noqa: E402


def test_nouns_by_definiteness_and_verbs():
    noun = json.dumps({"word": "книга", "pos": "noun", "forms": [{"form": "mk-decl-noun-f", "tags": ["inflection-template"]},
        {"form": "книга", "tags": ["indefinite", "singular"]}, {"form": "книгата", "tags": ["definite", "singular", "unspecified"]},
        {"form": "книгава", "tags": ["definite", "proximal", "singular"]}, {"form": "книгана", "tags": ["definite", "distal", "singular"]},
        {"form": "книги", "tags": ["indefinite", "plural"]}], "senses": [{"glosses": ["book"]}]}, ensure_ascii=False)
    verb = json.dumps({"word": "чита", "pos": "verb", "forms": [{"form": "чита", "tags": ["canonical", "imperfective"]},
        {"form": "читам", "tags": ["first-person", "present", "singular"]}, {"form": "читав", "tags": ["first-person", "imperfect", "singular"]},
        {"form": "читал", "tags": ["imperfect", "masculine"]}, {"form": "сум читал", "tags": ["multiword-construction", "perfect"]}], "senses": [{"glosses": ["to read"]}]}, ensure_ascii=False)
    n, v = list(parse_entries([noun, verb]))
    assert n["gender"] == "f"
    index = build_index([n, v])
    assert {"lemma": n["id"], "pos": "noun", "case": "def", "number": "sg", "gender": "f"} in index["книгата"]
    assert {"lemma": n["id"], "pos": "noun", "case": "prox", "number": "sg", "gender": "f"} in index["книгава"]
    assert {"lemma": v["id"], "pos": "verb", "person": "1", "number": "sg", "tense": "pres", "aspect": "impf"} in index["читам"]
    assert {"lemma": v["id"], "pos": "verb", "number": "sg", "gender": "m", "tense": "lpart", "aspect": "impf"} in index["читал"]
    assert "сум читал" not in index


def test_codes():
    for a in ({"pos": "noun", "case": "dist", "number": "pl"}, {"pos": "verb", "person": "2", "number": "pl", "tense": "aor", "aspect": "pf"}):
        assert decode_analysis(encode_analysis(a), "1") == {"lemma": "1", **a}
