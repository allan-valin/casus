import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from learn_lso import page_of  # noqa: E402

FIX = Path(__file__).parent / "fixtures" / "lso" / "nominals-1__a-stems.html"


def test_a_guide_page_becomes_a_lesson():
    p = page_of(FIX.read_text(encoding="utf-8"), "nominals-1", "a-stems")
    assert p["title"] == "-a stems"
    h = p["html"]
    assert "<h1" not in h and "गजः" in h and "<table" in h
    assert "गज</span>" in h or "गज " in h          # inline IAST gaja gets its Devanagari
    assert 'href="https://www.learnsanskrit.org/' in h or "href" not in h
