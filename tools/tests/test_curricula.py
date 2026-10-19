"""Every curriculum written for Casus is well formed (a YAML slip silently splits a sentence or a table cell)."""
import sys
from pathlib import Path

import pytest
import yaml

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from learn_curriculum import _load  # noqa: E402

CURRICULA = sorted(p for p in (Path(__file__).resolve().parents[1] / "curricula").iterdir() if p.is_dir() or p.suffix == ".yml")


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
