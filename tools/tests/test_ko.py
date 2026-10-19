import json
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from casus_build.ko.parse import form_name, parse_entries, particle_entries, build_index  # noqa: E402


def test_form_names():
    assert form_name({"indicative", "informal", "non-past", "polite"}) == "haeyo"
    assert form_name({"formal", "indicative", "past", "polite"}) == "hamnida past"
    assert form_name({"informal", "interrogative", "non-past", "polite"}) == "haeyo q"
    assert form_name({"formal", "indicative", "non-past"}) == "handa"
    assert form_name({"infinitive"}) == "inf" and form_name({"causative", "informal"}) is None


def test_entries_and_particles():
    line = json.dumps({"word": "먹다", "pos": "verb", "forms": [{"form": "meokda", "tags": ["romanization"]}, {"form": "먹어요", "tags": ["indicative", "informal", "non-past", "polite"]},
                                                                 {"form": "먹었습니다", "tags": ["formal", "indicative", "past", "polite"]}], "senses": [{"glosses": ["to eat"]}]}, ensure_ascii=False)
    e = list(parse_entries([line]))[0]
    ps = particle_entries(1000)
    index = build_index([e, *ps])
    assert {"lemma": e["id"], "pos": "verb", "form": "haeyo"} in index["먹어요"]
    assert {"lemma": e["id"], "pos": "verb", "form": "hamnida past"} in index["먹었습니다"]
    assert any(a["pos"] == "particle" for a in index["을"]) and any(a["pos"] == "particle" for a in index["에서"])


def test_codes():
    from casus_build.ko.codes import encode_analysis, decode_analysis
    for a in ({"pos": "verb", "form": "haeyo past q"}, {"pos": "noun"}, {"pos": "particle"}, {"pos": "adj", "form": "inf"}):
        assert decode_analysis(encode_analysis(a), "1") == {"lemma": "1", **a}


def test_form_of_entries_are_left_out():
    line = json.dumps({"word": "가요", "pos": "verb", "forms": [], "senses": [{"glosses": ["polite form of 가다"], "tags": ["form-of"]}]}, ensure_ascii=False)
    assert list(parse_entries([line])) == []
