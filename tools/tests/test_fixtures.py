from pathlib import Path

FIXTURES = Path(__file__).parent / "fixtures"


def test_dictline_sample_present_and_varied():
    lines = (FIXTURES / "dictline_sample.txt").read_text(encoding="latin-1").splitlines()
    assert len(lines) >= 20, "fixture too small to cover the declensions"
    assert any(line.startswith("ros ") for line in lines), "expected a 1st-declension noun"


def test_inflects_sample_present():
    lines = (FIXTURES / "inflects_sample.txt").read_text(encoding="latin-1").splitlines()
    assert len(lines) >= 20
