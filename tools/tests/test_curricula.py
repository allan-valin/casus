"""Every curriculum written for Casus is well formed (a YAML slip silently splits a sentence or a table cell)."""
import sys
from pathlib import Path

import pytest
import yaml

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from learn_curriculum import _load  # noqa: E402

CURRICULA = sorted(p for p in (Path(__file__).resolve().parents[1] / "curricula").iterdir() if (p.is_dir() and (p / "meta.yml").exists()) or p.suffix == ".yml")


@pytest.mark.parametrize("path", CURRICULA, ids=lambda p: p.name)
def test_curriculum_is_well_formed(path):
    data = _load(path)
    seen = set()
    for lv in data["levels"]:
        for topic in lv["topics"]:
            assert set(topic["title"]) == {"en", "pt"}
            for l in topic["lessons"]:
                where = f"{lv['id']} {l['id']}"
                assert l["id"] not in seen, where
                seen.add(l["id"])
                assert set(l["meaning"]) == {"en", "pt"} and set(l["intro"]) == {"en", "pt"}, where
                assert l.get("match"), f"{where}: no rule, so no exercises from Tatoeba"
                for e in l.get("examples", []):
                    assert len(e) in (3, 4) and all(isinstance(x, str) and x for x in e), f"{where}: example {e}"
                    if len(e) == 4:
                        assert e[3].lower() in e[0].lower(), f"{where}: target {e[3]!r} not in {e[0]!r}"
                t = l.get("table")
                if t:
                    for k in ("en", "pt"):
                        width = len(t["head"][k])
                        for row in t["rows"]:
                            assert len(row) == width, f"{where}: row {row} has {len(row)} cells, head {width}"
                for s in l.get("sections", []):
                    assert isinstance(s["body"], str) or set(s["body"]) == {"en", "pt"}, where
                for m in l.get("mistakes", []):
                    assert m["wrong"] != m["right"] and set(m["why"]) == {"en", "pt"}, where


def test_ai_written_curricula_mark_their_lessons(tmp_path):
    import yaml
    from learn_curriculum import curriculum_learn
    d = tmp_path / "xx"; d.mkdir()
    (d / "meta.yml").write_text(yaml.safe_dump({"system": "CEFR", "level_files": ["A1"], "ai_written": True, "credit": {"en": "c", "pt": "c"}}), encoding="utf-8")
    (d / "A1.yml").write_text(yaml.safe_dump({"id": "A1", "topics": [{"title": {"en": "T", "pt": "T"}, "lessons": [
        {"id": "xx-1", "title": "a", "meaning": {"en": "m", "pt": "m"}, "intro": {"en": "x", "pt": "x"}}]}]}), encoding="utf-8")
    index, lessons, _ = curriculum_learn(d)
    assert lessons["xx-1"]["ai"] is True
    assert index["levels"][0]["topics"][0]["lessons"][0]["ai"] is True


def test_no_word_in_a_rule_or_pool_is_read_as_a_yaml_boolean():
    """on, no, yes, off are words in English, Spanish, French… (YAML 1.1 reads them as booleans unless quoted)"""
    import glob
    import yaml
    flags = {"start", "attested", "ai_written", "notStart", "whole_words", "strict_attested", "noTrail", "unknown"}
    bad = []

    def walk(x, path):
        if isinstance(x, bool) and path.split("/")[-1].split("[")[0] not in flags:
            bad.append(path)
        elif isinstance(x, dict):
            for k, v in x.items():
                walk(v, f"{path}/{k}")
        elif isinstance(x, list):
            for i, v in enumerate(x):
                walk(v, f"{path}[{i}]")
    for f in sorted(glob.glob(str(Path(__file__).resolve().parents[1] / "curricula" / "*" / "*.yml"))):
        walk(yaml.safe_load(open(f, encoding="utf-8")), f)
    assert not bad, bad
