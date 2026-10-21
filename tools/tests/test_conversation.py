"""Conversation practice: the published guidelines and templates hold together, and the checker catches the slips
the writing rules forbid (a unit that never brings an item back, review that repeats old lines, a missing narrator
language, a speaker outside the cast)."""
import copy
import re
import sys
from pathlib import Path

import pytest
import yaml

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from conversation_check import check_bible, check_course, check_unit  # noqa: E402

ROOT = Path(__file__).resolve().parents[2]
TEMPLATE = ROOT / "tools" / "conversation" / "_template"
GUIDES = ROOT / "docs" / "conversation"
UI = ["en", "pt-BR", "de", "mk", "ar"]


def _yaml(p):
    return yaml.safe_load(p.read_text(encoding="utf-8"))


@pytest.fixture
def bible():
    return _yaml(TEMPLATE / "story-bible.yml")


@pytest.fixture
def units():
    return [_yaml(p) for p in sorted(TEMPLATE.glob("A1-*.yml"))]


# --- the published guidelines ------------------------------------------------------------------------------------

@pytest.mark.parametrize("lang", UI)
def test_guide_exists_in_every_interface_language(lang):
    assert (GUIDES / f"GUIDE.{lang}.md").exists()


def test_guides_have_the_same_sections():
    """a translation that drops a section leaves its readers without that rule"""
    def shape(lang):
        text = (GUIDES / f"GUIDE.{lang}.md").read_text(encoding="utf-8")
        return [len(m.group(1)) for m in re.finditer(r"^(#+) ", text, re.M)], len(re.findall(r"^\d+\. ", text, re.M))
    en = shape("en")
    for lang in UI[1:]:
        assert shape(lang) == en, lang


def test_no_brand_name_anywhere():
    """the technique is described, never attributed to a commercial course"""
    files = list(GUIDES.glob("*.md")) + list(TEMPLATE.glob("*.yml"))
    for f in files:
        assert "pimsleur" not in f.read_text(encoding="utf-8").lower(), f.name


def test_index_links_every_guide():
    index = (GUIDES / "README.md").read_text(encoding="utf-8")
    for lang in UI:
        assert f"GUIDE.{lang}.md" in index


# --- the templates are themselves valid --------------------------------------------------------------------------

def test_template_bible_is_valid(bible):
    assert check_bible(bible) == []


def test_template_units_are_valid(bible, units):
    assert len(units) >= 2
    for u in units:
        errors, _ = check_unit(u, bible)
        assert errors == [], u["id"]
    assert check_course(units, bible) == []


# --- the checker catches each rule -------------------------------------------------------------------------------

def test_missing_narrator_language_is_an_error(bible, units):
    u = copy.deepcopy(units[0])
    step = next(s for s in u["steps"] if s["type"] == "narrator")
    step["text"].pop(bible["narrator_languages"][-1])
    errors, _ = check_unit(u, bible)
    assert any("narrator" in e for e in errors)


def test_unknown_speaker_is_an_error(bible, units):
    u = copy.deepcopy(units[0])
    next(s for s in u["steps"] if s["type"] == "dialogue")["lines"][0]["speaker"] = "nobody"
    errors, _ = check_unit(u, bible)
    assert any("nobody" in e for e in errors)


def test_unknown_step_type_is_an_error(bible, units):
    u = copy.deepcopy(units[0])
    u["steps"].append({"type": "lecture"})
    errors, _ = check_unit(u, bible)
    assert any("lecture" in e for e in errors)


def test_new_item_never_prompted_is_an_error(bible, units):
    """anticipation: every new item is asked for, not only heard"""
    u = copy.deepcopy(units[0])
    u["new_items"].append({"id": "ghost", "text": "Gespenst", "meaning": {l: "x" for l in bible["narrator_languages"]}})
    errors, _ = check_unit(u, bible)
    assert any("ghost" in e for e in errors)


def test_prompt_for_an_item_not_in_the_unit_is_an_error(bible, units):
    u = copy.deepcopy(units[0])
    next(s for s in u["steps"] if s["type"] == "prompt")["items"] = ["never-introduced"]
    errors, _ = check_unit(u, bible)
    assert any("never-introduced" in e for e in errors)


def test_item_dropped_after_its_unit_breaks_the_schedule(bible, units):
    """graduated-interval recall: an item comes back in the next unit"""
    later = copy.deepcopy(units[1])
    first_items = {i["id"] for i in units[0]["new_items"]}
    later["reviews"] = [r for r in later["reviews"] if r["item"] not in first_items]
    for s in later["steps"]:
        if s["type"] == "prompt":
            s["items"] = [i for i in s.get("items", []) if i not in first_items]
    errors = check_course([units[0], later], bible)
    assert errors and any("schedule" in e for e in errors)


def test_review_repeating_an_old_line_is_an_error(bible, units):
    """review is a new situation, never the same lines again"""
    later = copy.deepcopy(units[1])
    old = next(ln for ln in next(s for s in units[0]["steps"] if s["type"] == "dialogue")["lines"] if len(ln["text"].split()) >= 3)
    next(s for s in later["steps"] if s["type"] == "dialogue")["lines"][0] = copy.deepcopy(old)
    errors = check_course([units[0], later], bible)
    assert any("repeats" in e for e in errors)


def test_review_share_far_from_a_quarter_is_a_warning(bible, units):
    later = copy.deepcopy(units[1])
    for s in later["steps"]:
        if s["type"] == "prompt" and s.get("review"):
            s["review"] = False
    _, warnings = check_unit(later, bible)
    assert any("review" in w for w in warnings)


def test_protagonist_form_must_exist_in_the_bible(bible, units):
    u = copy.deepcopy(units[0])
    u["protagonist"] = "x"
    errors, _ = check_unit(u, bible)
    assert any("protagonist" in e for e in errors)


def test_bible_cast_voice_must_be_declared(bible):
    b = copy.deepcopy(bible)
    b["cast"][0]["voice"] = "no-such-voice"
    assert any("no-such-voice" in e for e in check_bible(b))


def test_bible_needs_both_cultures(bible):
    """culture notes of the taught country AND the narrator's, so the clashes can be written"""
    b = copy.deepcopy(bible)
    b["culture"]["narrator"] = []
    assert any("narrator" in e for e in check_bible(b))


def test_audience_steps_and_tracks_need_only_their_languages(bible, units):
    """Allan, 2026-10-21: neutral English plus comparisons for one audience; units for one track only."""
    unit = copy.deepcopy(units[0])
    one = bible["narrator_languages"][0]
    unit["steps"].insert(0, {"type": "narrator", "for": [one], "text": {one: "only for one audience"}})
    errors, _ = check_unit(unit, bible)
    assert not [e for e in errors if "narrator text lacks" in e]
    unit["tracks"] = [one]
    for i in unit["new_items"]:
        i["meaning"] = {one: "x"}
    errors, _ = check_unit(unit, bible)
    assert not [e for e in errors if "lacks" in e]


# --- courses with audience versions (Allan, 2026-10-22: the German course has E / A / M versions of some slots) -----

TRACK_BIBLE = {"narrator_languages": ["en", "ar"], "protagonist": {"forms": {"f": "x", "m": "y"}},
               "cast": [{"id": "becker", "name": "B"}]}


def _u(uid, number, items, uses=(), tracks=None, reviews=(), review_for=None):
    steps = [{"type": "prompt", "ask": {"en": "a", "ar": "a"}, "answer": {"text": "x"}, "items": [i]} for i in items for _ in range(2)]
    for r in uses:
        st = {"type": "prompt", "review": True, "ask": {"en": "a", "ar": "a"}, "answer": {"text": "x"}, "items": [r]}
        if review_for and r in review_for:
            st["for"] = review_for[r]
            st["ask"] = {l: "a" for l in review_for[r]}
        steps.append(st)
    u = {"id": uid, "level": "A1", "number": number, "title": {"en": "t", "ar": "t"}, "situation": {"en": "s", "ar": "s"},
         "protagonist": "f", "new_items": [{"id": i, "text": i, "meaning": {"en": i, "ar": i}} for i in items],
         "reviews": [{"item": r, "from": "?", **({"for": review_for[r]} if review_for and r in review_for else {})} for r in reviews],
         "steps": steps + [{"type": "selfcheck"}]}
    if tracks:
        u["tracks"] = tracks
    return u


def test_audience_versions_have_their_own_schedule():
    units = [
        _u("A1-01", 1, ["a"]),
        _u("A1-02", 2, ["e"], uses=["a"], reviews=["a"], tracks=["en"]),
        _u("A1-02-ar", 2, ["r"], uses=["a"], reviews=["a"], tracks=["ar"]),
        _u("A1-03", 3, ["c"], uses=["e", "r"], reviews=["e", "r"], review_for={"e": ["en"], "r": ["ar"]}),
    ]
    assert check_course(units, TRACK_BIBLE) == []


def test_an_audience_still_needs_its_reviews():
    units = [
        _u("A1-01", 1, ["a"]),
        _u("A1-02", 2, ["e"], uses=["a"], reviews=["a"], tracks=["en"]),
        _u("A1-02-ar", 2, ["r"], uses=["a"], reviews=["a"], tracks=["ar"]),
        _u("A1-03", 3, ["c"], uses=["r"], reviews=["r"], review_for={"r": ["ar"]}),
        _u("A1-04", 4, ["d"], uses=["c"], reviews=["c"]),
    ]
    errors = check_course(units, TRACK_BIBLE)
    assert any("schedule" in e and "e (" in e for e in errors)
    assert not any("r (" in e for e in errors)


def test_disjoint_versions_may_introduce_the_same_item():
    units = [_u("A1-01", 1, ["a"]), _u("A1-02", 2, ["kita"], uses=["a"], reviews=["a"], tracks=["en"]),
             _u("A1-02-ar", 2, ["kita"], uses=["a"], reviews=["a"], tracks=["ar"])]
    assert not [e for e in check_course(units, TRACK_BIBLE) if "already introduced" in e]


def test_a_prompt_for_one_audience_needs_only_its_language():
    u = _u("A1-02", 2, ["b"], uses=["a"], reviews=["a"], review_for={"a": ["ar"]})
    errors, _ = check_unit(u, TRACK_BIBLE)
    assert not [e for e in errors if "prompt lacks" in e]
