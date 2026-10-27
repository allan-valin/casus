"""Splicing lessons written for Casus into a built Learn (2026-10-27): after the level's core topics, before books and
word lists; a rerun replaces, never duplicates."""
import json
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from learn_add_written import splice  # noqa: E402


def test_written_topics_go_after_the_core_and_a_rerun_replaces(tmp_path):
    (tmp_path / "learn").mkdir()
    index = {"levels": [{"id": "A1", "topics": [{"id": "de-A1-t1", "lessons": [{"id": "g1"}]}, {"id": "A1-wb-x", "lessons": [{"id": "b1"}]}]}],
             "files": ["learn/g1.json"]}
    level = {"id": "A1", "topics": [{"id": "A1-t1", "lessons": [{"id": "new"}]}]}
    for _ in range(2):
        splice(index, [level], {"new": {"id": "new"}}, {"A1": {"new": {"qs": []}}}, tmp_path)
    assert [t["id"] for t in index["levels"][0]["topics"]] == ["de-A1-t1", "A1-t1", "A1-wb-x"]
    assert index["files"] == ["learn/g1.json", "learn/q-new.json", "learn/new.json"]
    assert json.loads((tmp_path / "learn" / "new.json").read_text())["id"] == "new"


def test_only_new_lessons_get_a_free_topic_number_and_leave_the_rest(tmp_path):
    # Macedonian (2026-10-27): new lessons appended to A1.yml must not rewrite the level's existing lessons
    from learn_add_written import keep_only
    (tmp_path / "learn").mkdir()
    index = {"levels": [{"id": "A1", "topics": [{"id": "A1-t1", "title": {"en": "Old"}, "lessons": [{"id": "old"}]}, {"id": "A1-w-prep", "lessons": []}]}], "files": []}
    built = [{"id": "A1", "topics": [{"id": "A1-t1", "title": {"en": "Old"}, "lessons": [{"id": "old"}]}, {"id": "A1-t2", "title": {"en": "New"}, "lessons": [{"id": "new"}]}]}]
    levels, lessons = keep_only(built, {"old": {"id": "old", "x": 1}, "new": {"id": "new"}}, ["new"], index)
    assert lessons == {"new": {"id": "new"}}
    assert [t["id"] for t in levels[0]["topics"]] == ["A1-t2"]
    splice(index, levels, lessons, {}, tmp_path)
    assert [t["id"] for t in index["levels"][0]["topics"]] == ["A1-t1", "A1-t2", "A1-w-prep"]
    assert not (tmp_path / "learn" / "old.json").exists()


def test_a_topic_emptied_by_the_splice_is_dropped(tmp_path):
    # Macedonian (2026-10-27): a corrected topic title made a new topic and left the old one empty in the menu
    (tmp_path / "learn").mkdir()
    index = {"levels": [{"id": "A2", "topics": [{"id": "A2-t9", "title": {"en": "Saying how"}, "lessons": [{"id": "x"}]},
                                                 {"id": "A2-wb", "lessons": [{"id": "b"}]}]}], "files": []}
    level = {"id": "A2", "topics": [{"id": "A2-t10", "title": {"en": "Saying how, and whose"}, "lessons": [{"id": "x"}]}]}
    splice(index, [level], {"x": {"id": "x"}}, {}, tmp_path)
    assert [t["id"] for t in index["levels"][0]["topics"]] == ["A2-t10", "A2-wb"]
