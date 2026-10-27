"""Conversation ↔ Learn (Allan, 2026-10-27, T1): every lesson a unit names must exist in that language's Learn; the
report lists, per Learn level, the grammar lessons the course practises AND the ones it does not; a finished course
with gaps does not build (a course still in development is reported, not blocked)."""
import json
import shutil
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from learn_coverage import coverage, coverage_errors, lessons_by_unit, syllabus  # noqa: E402
from build_conversation import build  # noqa: E402

TEMPLATE = Path(__file__).resolve().parents[1] / "conversation" / "_template"

LEARN = {"levels": [
    {"id": "A1", "topics": [
        {"id": "A1-t1", "kind": "grammar", "lessons": [{"id": "a1-sum"}, {"id": "a1-plural"}]},
        {"id": "de-A1-t2", "kind": "grammar", "lessons": [{"id": "de-no_01"}]},
        {"id": "A1-w-prep", "kind": "grammar", "lessons": [{"id": "de-w-prep-1"}]},      # word lists: not the syllabus
        {"id": "A1-wb-German", "kind": "grammar", "lessons": [{"id": "de-wb1"}]},        # a book's chapters: neither
        {"id": "A1-v", "kind": "vocab", "lessons": [{"id": "de-v1"}]}]},
    {"id": "A2", "topics": [{"id": "A2-t1", "kind": "grammar", "lessons": [{"id": "a2-future"}]}]},
    {"id": "Reference", "topics": [{"id": "Reference-x", "kind": "grammar", "lessons": [{"id": "ref-1"}]}]}]}


def _unit(uid, lessons, level="A1", **kw):
    return {"id": uid, "level": level, "number": int(uid.split("-")[1]), "title": {"en": uid}, "learn_lessons": lessons, **kw}


def test_syllabus_is_the_core_grammar_topics_of_each_level():
    assert syllabus(LEARN, "de") == {"A1": ["a1-sum", "a1-plural", "de-no_01"], "A2": ["a2-future"]}


def test_coverage_lists_covered_and_not_covered_per_level():
    cov = coverage([_unit("A1-01", ["a1-sum"]), _unit("A1-02", ["a2-future", "de-w-prep-1"])], LEARN, "de")
    assert cov["levels"] == [
        {"level": "A1", "covered": ["a1-sum"], "missing": ["a1-plural", "de-no_01"]},
        {"level": "A2", "covered": ["a2-future"], "missing": []}]
    assert cov["dead"] == []


def test_a_lesson_that_is_not_in_learn_is_dead_and_always_an_error():
    cov = coverage([_unit("A1-01", ["a1-accusative", "a1-sum"])], LEARN, "de")
    assert cov["dead"] == [("A1-01", "a1-accusative")]
    assert coverage_errors(cov, in_development=True) == ["A1-01: learn lesson a1-accusative does not exist in Learn"]


def test_gaps_block_only_a_finished_course():
    cov = coverage([_unit("A1-01", ["a1-sum", "a1-plural", "de-no_01"])], LEARN, "de")
    assert coverage_errors(cov, in_development=True) == []
    assert coverage_errors(cov, in_development=False) == ["coverage: A2 lesson a2-future is practised in no unit"]


def test_themes_without_a_learn_lesson_are_reported_not_errors():
    cov = coverage([_unit("A1-01", ["a1-sum"], learn_missing=["c2-dialect"])], LEARN, "de")
    assert cov["no_lesson"] == [("A1-01", "c2-dialect")]
    assert coverage_errors(cov, in_development=True) == []


def test_reverse_links_name_each_slot_once():
    units = [_unit("A1-02-e", ["a1-sum"], tracks=["en"]), _unit("A1-02-m", ["a1-sum"], tracks=["mk"]), _unit("A1-03", ["a1-sum", "ref-1"])]
    links = lessons_by_unit(units)
    assert [x["unit"] for x in links["a1-sum"]] == ["A1-02", "A1-03"]
    assert links["ref-1"] == [{"unit": "A1-03", "level": "A1", "title": {"en": "A1-03"}}]


# --- the build ---------------------------------------------------------------------------------------------------

def _learn_dir(tmp_path, code="de"):
    d = tmp_path / "data" / code
    d.mkdir(parents=True)
    (d / "learn.json").write_text(json.dumps(LEARN), encoding="utf-8")
    return tmp_path / "data"


def test_a_course_naming_a_missing_lesson_is_not_built(tmp_path):
    src = tmp_path / "conversation"
    shutil.copytree(TEMPLATE, src / "de")
    p = src / "de" / "A1-01.yml"
    p.write_text(p.read_text(encoding="utf-8").replace("learn_lessons: []", "learn_lessons: [a1-accusative]"), encoding="utf-8")
    report = build(src, tmp_path / "talk", learn=_learn_dir(tmp_path))
    assert "A1-01: learn lesson a1-accusative does not exist in Learn" in report["de"]["errors"]
    assert not (tmp_path / "talk" / "de.json").exists()


def test_a_finished_course_with_gaps_is_not_built(tmp_path):
    src = tmp_path / "conversation"
    shutil.copytree(TEMPLATE, src / "de")
    b = src / "de" / "story-bible.yml"
    b.write_text(b.read_text(encoding="utf-8").replace("in_development: true", "in_development: false"), encoding="utf-8")
    report = build(src, tmp_path / "talk", learn=_learn_dir(tmp_path))
    assert "coverage: A1 lesson a1-sum is practised in no unit" in report["de"]["errors"]


def test_the_build_writes_the_reverse_links_and_the_in_development_flag(tmp_path):
    src = tmp_path / "conversation"
    shutil.copytree(TEMPLATE, src / "de")
    p = src / "de" / "A1-01.yml"
    p.write_text(p.read_text(encoding="utf-8").replace("learn_lessons: []", "learn_lessons: [a1-sum]"), encoding="utf-8")
    out = tmp_path / "talk"
    report = build(src, out, learn=_learn_dir(tmp_path))
    assert report["de"]["errors"] == []
    assert json.loads((out / "lessons" / "de.json").read_text(encoding="utf-8"))["a1-sum"][0]["unit"] == "A1-01"
    assert json.loads((out / "de.json").read_text(encoding="utf-8"))["in_development"] is True


def test_without_learn_data_the_check_is_skipped_and_said(tmp_path):
    # data/ is not in git (legal): a checkout without it still builds, and the report says Learn was not checked
    src = tmp_path / "conversation"
    shutil.copytree(TEMPLATE, src / "de")
    report = build(src, tmp_path / "talk", learn=tmp_path / "nothing")
    assert report["de"]["errors"] == []
    assert any("Learn not checked" in w for w in report["de"]["warnings"])
