"""Romanian cells (2026-10-21): one form serves two cases (casa: nominative and accusative; casei: genitive and dative);
adjective tables name no case at all, so the ending decides."""
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from casus_build.generic import _key_ro, _ro_cases  # noqa: E402


def test_two_cases_two_readings():
    got = _ro_cases({"accusative", "definite", "nominative", "singular"}, "casa")
    assert sorted(next(c for c in t if c in ("nominative", "accusative")) for t in got) == ["accusative", "nominative"]


def test_adjective_case_from_the_ending():
    assert {"genitive", "dative"} == {c for t in _ro_cases({"definite", "masculine", "singular", "error-unrecognized-form"}, "bunului") for c in t if c.endswith("ive") and c not in ("definite",)}
    assert any("nominative" in t for t in _ro_cases({"indefinite", "feminine", "singular", "error-unrecognized-form"}, "bună"))


def test_cedilla_letters_fold():
    assert _key_ro("Şcoală") == "școală"
    assert _key_ro("ţară") == "țară"
