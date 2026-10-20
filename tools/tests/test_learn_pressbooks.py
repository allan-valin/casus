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


def test_a_chapter_without_section_headings_is_one_section():
    """an anthology chapter (one text with its introduction and notes) has no inner <h1>: it is one lesson"""
    raw = ('<section><h1 class="entry-title">Carta a Luis de Santángel</h1><h2>Cristóbal Colón</h2>'
           '<p>' + 'Señor, porque sé que habréis placer de la gran vitoria. ' * 5 + '</p></section>')
    title, secs = chapter_sections(raw)
    assert title == "Carta a Luis de Santángel" and len(secs) == 1
    assert secs[0]["title"] == "Carta a Luis de Santángel" and "<h4>Cristóbal Colón</h4>" in secs[0]["html"]
