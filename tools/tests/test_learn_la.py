import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from learn_la import parse_lesson  # noqa: E402

PAGE = (Path(__file__).parent / "fixtures" / "dooge-lesson7.html").read_text(encoding="utf-8")


def test_a_lesson_of_the_book():
    l = parse_lesson(PAGE)
    assert l["number"] == "VII" and l["title"] == "The First or Ā-Declension"
    assert "<table" in l["html"] and "page2" not in l["html"] and "<img" not in l["html"]
    assert "Agricola cum fīliā in casā habitat." in l["drill"]
    assert "Quis cum agricolā in casā habitat?" in l["drill"]
    assert l["exercises_html"].count("<li>") >= 10
    assert any(v == ["agricola", "farmer"] or v[0] == "agricola" for v in l["vocab"]) or l["vocab"] == []
