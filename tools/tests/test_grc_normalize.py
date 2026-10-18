"""Languages plan Task 10: Greek normalisation, same fixture as the JS side."""
import json
from pathlib import Path

from casus_build.grc.normalize import normalize_grc, strip_grc, has_marks

FIXTURE = json.loads((Path(__file__).resolve().parents[2] / "tests/fixtures/normalization.grc.json").read_text(encoding="utf-8"))


def test_normalize_matches_the_shared_fixture():
    for raw, expected in FIXTURE["normalize"]:
        assert normalize_grc(raw) == expected, raw


def test_strip_removes_every_mark():
    for raw, expected in FIXTURE["strip"]:
        assert strip_grc(raw) == expected, raw


def test_has_marks():
    for raw, expected in FIXTURE["hasMarks"]:
        assert has_marks(raw) is expected, raw
