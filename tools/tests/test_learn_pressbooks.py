import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from learn_pressbooks import chapter_sections  # noqa: E402

FIX = Path(__file__).parent / "fixtures" / "pressbooks" / "chapter.html"


def test_a_chapter_splits_at_its_section_headings():
    title, secs = chapter_sections(FIX.read_text(encoding="utf-8"))
    assert title == "Unidade 1 – Parte A – Apresentações"
    titles = [s["title"] for s in secs]
    assert titles[:3] == ["1 – Apresentações", "2 – Saudações – Greetings", "3 – A Semana e os Meses do Ano"]
    for s in secs:
        assert "<img" not in s["html"] and "<iframe" not in s["html"] and s["html"].strip()
