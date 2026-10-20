import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from learn_gutenberg import sections_of, to_html  # noqa: E402

FIX = Path(__file__).parent / "fixtures" / "gutenberg" / "ginever-ch3.txt"


def test_sections_split_at_headings_with_their_exercises():
    s = sections_of(FIX.read_text(encoding="utf-8"))
    titles = [x["title"] for x in s]
    assert titles[:4] == ["The noun", "Number", "Cases of the noun", "The genitive"]
    number = s[1]
    assert number["chapter"] == "The noun" and "Exercise II" in number["text"]
    assert not any("Footnotes" in t for t in titles) and "Exercise II" not in titles


def test_markup():
    h = to_html("_Number_ is =-k=.\n\n  rigó     (thrush),     plural rigók")
    assert "<i>Number</i>" in h and "<b>-k</b>" in h and "<pre>" in h
