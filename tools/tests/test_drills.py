"""Drills (Allan, 2026-10-18): model words per language with their full tables, in data/<code>/drills.json."""
import json
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from build_drills import pick_models  # noqa: E402

LEMMAS = {
    "1": {"headword": "rosa", "dict_form": "rosa, -ae f.", "pos": "noun", "freq": "B"},
    "2": {"headword": "sum", "dict_form": "sum", "pos": "adj", "freq": "D"},
    "3": {"headword": "sum", "dict_form": "sum, -esse", "pos": "verb", "freq": "A"},
    "4": {"headword": "rosa", "dict_form": "rosa, -ae f.", "pos": "noun", "freq": "E"},
}
PARADIGMS = {"1": [["rosa", "nnsf"]], "3": [["est", "v3spia5"]], "4": [["rosae", "ngsf"]]}


def test_picks_by_headword_and_pos_most_frequent_first_and_skips_missing():
    models = [("rosa", "noun", "rose", "rosa"), ("sum", "verb", "to be", "ser"), ("nemo", "noun", "nobody", "ninguém")]
    out = pick_models(models, LEMMAS, lambda i: PARADIGMS.get(i))
    assert [m["id"] for m in out] == ["1", "3"]
    assert out[0] == {"id": "1", "headword": "rosa", "dict_form": "rosa, -ae f.", "pos": "noun", "gloss": {"en": "rose", "pt": "rosa"}, "rows": [["rosa", "nnsf"]]}


def test_the_built_files_exist_for_every_language_with_paradigms():
    root = Path(__file__).resolve().parents[2] / "data"
    for code in ("la", "grc", "de"):
        p = root / code / "drills.json"
        if not (root / code / "paradigms").exists():
            continue
        data = json.loads(p.read_text())
        assert {m["pos"] for m in data} >= {"noun", "verb"}, code

