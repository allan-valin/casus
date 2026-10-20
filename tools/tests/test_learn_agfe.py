"""Ancient Greek for Everyone (Major & Laughy, CC BY 4.0) as Learn lessons: one lesson per chapter, its parts as
sections, its Greek exercise sentences as extra sentences for exercises."""
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from learn_agfe import agfe_lessons, chapter, exercise_sentences  # noqa: E402

FIX = Path(__file__).parent / "fixtures" / "agfe"


def test_a_chapter_keeps_its_parts_and_drops_the_photos():
    parts = chapter((FIX / "chapter__10.html").read_text(encoding="utf-8"))
    assert [p["title"] for p in parts] == ["Conjunctions", "Key Terms and Concepts", "Exercises", "Readings"]
    assert all("<img" not in p["html"] and "<figure" not in p["html"] for p in parts)
    assert "postpositive" in parts[0]["html"]


def test_the_exercise_sentences_are_the_greek_ones():
    s = exercise_sentences((FIX / "chapter__10.html").read_text(encoding="utf-8"))
    assert s == ["δίδομεν τὰ σπέρματα ἀλλὰ δίδοτε τὸ ὕδωρ.", "τὰ σπέρματα δίδομεν, ὕδωρ δὲ δίδοτε."]


def test_one_lesson_per_chapter_with_title_credit_level_and_rule():
    index = {"levels": [{"id": "Beginner", "topics": []}, {"id": "Intermediate", "topics": []}]}
    lessons, questions = {}, {}
    n = agfe_lessons(FIX, {10: "Conjunctions"}, index, lessons, questions, levels={10: "Beginner"},
                     rules={10: {"seq": [{"word": ["καί", "ἀλλά", "δέ", "γάρ"]}]}})
    assert n == 1
    l = lessons["grc-agfe-10"]
    assert l["title"] == "10. Conjunctions" and l["level"] == "Beginner" and l["match"]["seq"][0]["word"][0] == "καί"
    assert "pressbooks.pub/ancientgreek/chapter/10/" in l["intro"]["en"] and "CC BY 4.0" in l["intro"]["en"]
    assert [s["title"]["en"] for s in l["sections"]][:2] == ["Conjunctions", "Key Terms and Concepts"]
    assert "ai" not in l and "grc-agfe-10" in questions["Beginner"]
    topic = index["levels"][0]["topics"][0]
    assert topic["lessons"][0]["id"] == "grc-agfe-10" and "Ancient Greek for Everyone" in topic["title"]["en"]
