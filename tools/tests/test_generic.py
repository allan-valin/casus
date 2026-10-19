import json
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from casus_build.generic import FINNISH, parse_entries, build_index, codes  # noqa: E402


def test_finnish_noun_and_codes():
    line = json.dumps({"word": "talo", "pos": "noun", "forms": [{"form": "talossa", "tags": ["inessive", "singular"]},
        {"form": "taloihin", "tags": ["illative", "plural"]}, {"form": "talo", "tags": ["canonical"]}], "senses": [{"glosses": ["house"]}]})
    e = list(parse_entries(FINNISH, [line]))[0]
    index = build_index([e])
    assert {"lemma": e["id"], "pos": "noun", "case": "ine", "number": "sg"} in index["talossa"]
    encode, decode, _j = codes(FINNISH)
    a = {"pos": "noun", "case": "ill", "number": "pl"}
    assert decode(encode(a), "1") == {"lemma": "1", **a}


def test_a_form_that_is_not_a_word_never_becomes_a_key():
    line = json.dumps({"word": "talo", "pos": "noun", "forms": [{"form": "/ˈtɑlo/", "tags": ["nominative", "singular"]},
        {"form": "talo", "tags": ["nominative", "singular"]}], "senses": [{"glosses": ["house"]}]})
    index = build_index(list(parse_entries(FINNISH, [line])))
    assert list(index) == ["talo"]


def test_a_headword_that_is_not_a_word_never_becomes_a_key():
    line = json.dumps({"word": "7/24", "pos": "adv", "forms": [], "senses": [{"glosses": ["all the time"]}]})
    assert build_index(list(parse_entries(FINNISH, [line]))) == {}


def test_a_table_without_person_tags_gets_the_person_from_its_order():
    from casus_build.generic import CONFIGS
    line = json.dumps({"word": "czytać", "pos": "verb", "forms": [
        {"form": "czytam", "tags": ["present", "singular"]}, {"form": "czytamy", "tags": ["plural", "present"]},
        {"form": "czytasz", "tags": ["present", "singular"]}, {"form": "czytacie", "tags": ["plural", "present"]},
        {"form": "czyta", "tags": ["present", "singular", "third-person"]}, {"form": "czytają", "tags": ["plural", "present", "third-person"]}],
        "senses": [{"glosses": ["to read"]}]}, ensure_ascii=False)
    index = build_index(list(parse_entries(CONFIGS["pl"], [line])))
    assert index["czytam"][0]["person"] == "1" and index["czytasz"][0]["person"] == "2" and index["czytacie"][0]["person"] == "2"
    assert index["czyta"][0]["person"] == "3"
