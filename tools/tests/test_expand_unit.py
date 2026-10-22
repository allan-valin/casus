"""The unit expander (Allan, 2026-10-21: write the remaining units): compact sources → full units that the checker
accepts, with second asks and the doubling review schedule added mechanically."""
import sys
from pathlib import Path

import yaml

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from conversation_check import check_course, check_unit  # noqa: E402
from expand_unit import expand, due_reviews  # noqa: E402

BIBLE = {"language": "mk", "narrator_languages": ["en", "pt"],
         "cast": [{"id": "vera", "name": "Вера"}], "protagonist": {"forms": {"f": "a", "m": "b"}}}


def _src(n, items, asks):
    return {"id": f"A1-{n:02d}", "protagonist": "f" if n % 2 else "m", "title": ["T", "T"], "situation": ["S", "S"],
            "learn": [], "culture": "c",
            "items": [[i, f"слово{i}", f"w{i}", f"p{i}"] for i in items],
            "dialogue": [["vera", f"Реченица број {n} еден два", "line", "linha"], ["protagonist", f"Одговор број {n} три четири", "a", "r"]],
            "teach": [{"note": ["note", "nota"]}] + [{"ask": ["say", "diga", f"слово{i}", i]} for i in asks]}


def test_due_reviews_follow_the_doubling_schedule():
    intro = {"x": 0, "y": 1, "z": 2}
    assert due_reviews(intro, 1) == ["x"]
    assert due_reviews(intro, 3) == ["x", "z"]          # x at 0+3, z at 2+1
    assert due_reviews(intro, 7) == ["x"]


def test_expanded_units_pass_the_checker_and_the_course_schedule():
    units = []
    for n in range(1, 9):
        ids = [f"u{n}i{k}" for k in range(10)]
        units.append(expand(_src(n, ids, ids[:5]), units))
    for u in units:
        errors, _ = check_unit(u, BIBLE)
        assert errors == [], (u["id"], errors)
        assert sum(1 for s in u["steps"] if s.get("items") and set(s["items"]) & {i["id"] for i in u["new_items"]}) >= 10
    assert check_course(units, BIBLE) == []
    u4 = units[3]
    assert any(s.get("review") for s in u4["steps"])
    assert {r["item"] for r in u4["reviews"]} >= {"u3i0", "u1i0"}   # from the unit before, and three before
    assert u4["steps"][-1]["type"] == "selfcheck"
    assert any(s.get("for") == ["pt"] for s in expand({**_src(9, ["a" + str(k) for k in range(10)], []), "teach": [{"pt_only": "No Brasil…"}]}, units)["steps"])


def test_item_ids_must_be_plain_ascii():
    import pytest
    with pytest.raises(ValueError, match="ascii"):
        expand({**_src(1, ["polekа"], []), "items": [["polekа", "полека", "slowly", "devagar"]]}, [])


def test_audience_versions_get_reviews_for_their_own_audience_only():
    """German course (Allan, 2026-10-22): E / A / M versions of a slot; a core unit after them reviews each audience's
    items only for that audience, and the checker accepts the result per audience"""
    langs = ["en", "ar", "mk"]
    bible = {"narrator_languages": langs, "cast": [{"id": "vera", "name": "B"}], "protagonist": {"forms": {"f": "a", "m": "b"}}}
    def src(uid, ids, tracks=None):
        ls = [l for l in langs if not tracks or l in tracks]
        d = {"id": uid, "protagonist": "f", "title": ["T"] * len(ls), "situation": ["S"] * len(ls), "learn": [],
             "items": [[i, f"Wort{i}", *[f"{l}{i}" for l in ls]] for i in ids],
             "dialogue": [["vera", f"Satz {uid} eins zwei", *["x"] * len(ls)], ["protagonist", f"Antwort {uid} drei", *["y"] * len(ls)]],
             "teach": []}
        if tracks:
            d["tracks"] = tracks
        return d
    units = []
    units.append(expand(src("A1-01", [f"c{k}" for k in range(10)]), units, langs))
    units.append(expand(src("A1-02", [f"e{k}" for k in range(10)], ["en"]), units, langs))
    units.append(expand(src("A1-02-am", [f"a{k}" for k in range(10)], ["ar", "mk"]), units, langs))
    third = expand(src("A1-03", [f"d{k}" for k in range(10)]), units, langs)
    units.append(third)
    rev = [s for s in third["steps"] if s.get("review")]
    assert any(s.get("for") == ["en"] and "e0-e" in s["items"] for s in rev)
    assert any(s.get("for") == ["ar", "mk"] and "a0-am" in s["items"] for s in rev)
    assert not any("c0" in s["items"] for s in rev)            # core items: due at positions 1 and 3, not 2
    assert "قولي" in rev[0]["ask"].get("ar", "قولي")
    assert check_course(units, bible) == []
    for u in units:
        assert check_unit(u, bible)[0] == []


def test_items_of_audience_versions_get_a_suffix_so_core_units_never_clash():
    """Allan's German course: a version teaches 'ich will' to one audience, a later core unit teaches it to all —
    the version's item ids carry the audience letters (-e, -a, -m), so the two never collide"""
    src = {**_src(2, ["will"], []), "tracks": ["ar"], "teach": [{"ask": ["x", "Ich will.", "will"]}]}
    u = expand(src, [], ["en", "ar", "mk"])
    assert [i["id"] for i in u["new_items"]] == ["will-a"]
    assert all(i.endswith("-a") for s in u["steps"] for i in (s.get("items") or []))
