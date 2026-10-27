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
