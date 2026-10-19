import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from casus_build.ko.conj import conjugate, infinitive  # noqa: E402


def test_infinitive_by_rule():
    assert [infinitive(w) for w in ["먹다", "가다", "오다", "보다", "하다", "마시다", "쓰다", "바쁘다", "주다", "되다", "서다"]] == \
        ["먹어", "가", "와", "봐", "해", "마셔", "써", "바빠", "줘", "돼", "서"]


def test_connectives_and_endings():
    m = conjugate("먹다", "verb")
    assert m["seq"] == ["먹으니"] and m["and"] == ["먹고"] and m["so"] == ["먹어서"] and m["but"] == ["먹지만"] and m["if"] == ["먹으면"] and m["since"] == ["먹으니까"]
    assert m["adn pres"] == ["먹는"] and m["adn past"] == ["먹은"] and m["adn fut"] == ["먹을"] and m["hamnida"] == ["먹습니다"]
    assert m["handa past"] == ["먹었다"] and m["haeyo"] == ["먹어요"] and m["bg"] == ["먹는데"]
    g = conjugate("가다", "verb")
    assert g["hamnida"] == ["갑니다"] and g["handa"] == ["간다"] and g["adn past"] == ["간"] and g["adn fut"] == ["갈"]


def test_l_stems_and_irregulars_from_wiktionarys_infinitive():
    s = conjugate("살다", "verb")
    assert s["since"] == ["사니까"] and s["hamnida"] == ["삽니다"] and s["adn pres"] == ["사는"] and s["if"] == ["살면"]
    d = conjugate("듣다", "verb", inf="들어")
    assert d["if"] == ["들으면"] and d["so"] == ["들어서"] and d["but"] == ["듣지만"]
    b = conjugate("괴롭다", "adj", inf="괴로워")
    assert b["if"] == ["괴로우면"] and b["handa past"] == ["괴로웠다"] and b["adn pres"] == ["괴로운"]
    assert conjugate("모르다", "verb", inf="몰라")["so"] == ["몰라서"]


def test_adjective_to_feel_verb():
    from casus_build.ko.conj import feel_verb
    assert feel_verb("괴롭다", inf="괴로워") == "괴로워하다"
    assert conjugate("괴로워하다", "verb")["handa past"] == ["괴로워했다"]


def test_entries_get_the_generated_forms_and_adjectives_their_feel_verb():
    from casus_build.ko.conj import add_conjugations
    entries = [{"id": 1, "headword": "괴롭다", "pos": "adj", "cells": [("괴로워", "inf")], "gloss_en": "painful", "ipa": [], "hanja": None},
               {"id": 2, "headword": "먹다", "pos": "verb", "cells": [("먹었다", "handa past")], "gloss_en": "to eat", "ipa": [], "hanja": None}]
    out = add_conjugations(entries, start_id=50)
    eat = out[1]["cells"]
    assert ("먹어서", "so") in eat and eat.count(("먹었다", "handa past")) == 1
    feel = [e for e in out if e["headword"] == "괴로워하다"][0]
    assert feel["pos"] == "verb" and feel["id"] == 50 and ("괴로워했다", "handa past") in feel["cells"] and "painful" in feel["gloss_en"]
