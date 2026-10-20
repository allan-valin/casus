import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from learn_nigrin import lessons_of, to_html, vocabulary  # noqa: E402

FIX = Path(__file__).parent / "fixtures" / "nigrin" / "sample.txt"


def test_lessons_split_at_their_headings():
    ls = lessons_of(FIX.read_text(encoding="utf-8"))
    assert [l["n"] for l in ls] == [6, 7]
    assert ls[0]["title"] == "Present tense — Přítomný čas"
    assert "Exercise II." in ls[0]["text"]


def test_vocabulary_and_html():
    ls = lessons_of(FIX.read_text(encoding="utf-8"))
    v = vocabulary(ls[0]["text"])
    assert ("dívka", "girl") in v and ("les", "forest") in v
    assert ("dům", "house") in vocabulary(ls[1]["text"])
    h = to_html("=Jdu do školy=. I go.\n\nVocabulary.\n\n  =les=, forest;")
    assert "<b>Jdu do školy</b>" in h and "<h4>Vocabulary.</h4>" in h
