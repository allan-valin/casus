import json
from pathlib import Path

import pytest

from casus_build.normalize import normalize_form

CASES = json.loads(
    (Path(__file__).parents[2] / "tests" / "fixtures" / "normalization.json").read_text()
)


@pytest.mark.parametrize("case", CASES, ids=lambda c: c["input"] or "empty")
def test_normalize(case):
    assert normalize_form(case["input"]) == case["expected"]
