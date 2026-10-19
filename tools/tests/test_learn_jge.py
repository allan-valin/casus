import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from learn_ja import parse_page, furi_segments, kana_of  # noqa: E402

PAGE = (Path(__file__).parent / "fixtures" / "jge-mo.md").read_text(encoding="utf-8")


def test_furigana_markup():
    assert furi_segments("{f|私|わたし}<b>も</b>{f|行|い}きます。") == [["私", "わたし"], ["も", None], ["行", "い"], ["きます。", None]]
    assert kana_of("{f|私|わたし}も{f|行|い}きます。") == "わたしもいきます。"


def test_a_page_becomes_a_lesson():
    l = parse_page(PAGE)
    assert l["title"] == "も" and l["meaning"] == "also; too; as well"
    assert "adds its noun" in l["intro"]
    assert [s["id"] for s in l["sections"]] == ["formation", "examples", "nuance", "contrast", "mistakes"]
    assert '<ruby>私<rt>わたし</rt></ruby>' in l["sections"][0]["html"] and '<table' in l["sections"][0]["html"]
    ex = l["examples"]
    assert ex[0] == {"furi": [["わたし", None], ["も", None], ["行", "い"], ["きます。", None]], "en": "I'll go too.", "target": "も", "kana": "わたしもいきます。", "text": "わたしも行きます。"}
    assert len(ex) == 2
    assert len(l["practice"]) == 2 and "____" in l["practice"][0]["q"] and "<b>も</b>" in l["practice"][0]["a"]
    assert "Tanaka is being added" in l["practice"][0]["a"]


def test_meaning_has_no_markdown_marks():
    l = parse_page("# が\n\n**Meaning** · marks the subject, and singles out *which one* it is; `が` too\n")
    assert l["meaning"] == "marks the subject, and singles out which one it is; が too"
