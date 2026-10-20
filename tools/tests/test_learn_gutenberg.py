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


def test_italic_subheadings_split_a_long_section():
    text = "NOUNS.\n\nIntro text.\n\n\n_Declension._\n\nThe noun is declined.\n\n_Rule._—not a heading.\n\n\n_Possessive suffixes._\n\nSuffixes."
    s = sections_of(text, subheads=True)
    assert [x["title"] for x in s] == ["Nouns", "Declension", "Possessive suffixes"]
    assert all(x["chapter"] == "Nouns" for x in s) and "_Rule._" in s[1]["text"]


def test_a_book_with_its_own_heading_pattern_skips_the_contents_and_front_matter():
    from learn_gutenberg import sections_of
    text = """LE PREMIER LIVRE

  PREMIÈRE LEÇON. Être--Indicatif Présent                    17
  DEUXIÈME LEÇON. Forme Négative                               18

PREMIÈRE LEÇON

I. ÉTUDE DE MOTS
Je suis, tu es, il est. """ + "Phrase. " * 60 + """

DEUXIÈME LEÇON

Je ne suis pas. """ + "Phrase. " * 60 + "\n"
    secs = sections_of(text, heading=r"[A-ZÈÉ]+ LEÇON\.?", min_chars=200)
    assert [s["title"] for s in secs] == ["Première leçon", "Deuxième leçon"]
    assert "Je suis" in secs[0]["text"] and "ÉTUDE DE MOTS" in secs[0]["text"]


def test_book_lessons_can_file_their_topics_under_a_group():
    """a university textbook's chapters go under the University header of the Learn list (topic group)"""
    from learn_gutenberg import book_lessons
    index = {"levels": [{"id": "Beginner", "topics": []}]}
    text = "Module 1: Letters\n" + "The alphabet. " * 40 + "\nModule 2: Sounds\n" + "Vowels. " * 60 + "\n"
    n = book_lessons(text, "grc-peek", {"en": "c", "pt": "c"}, "Peek", ["Beginner"], index, {}, {}, heading=r"Module \d+(: .*)?$",
                     min_chars=100, group="university")
    assert n == 2 and all(tp["group"] == "university" for tp in index["levels"][0]["topics"])


def test_a_group_of_chapters_is_named_by_their_short_labels():
    text = "".join(f"Module {n}: A long title about point {n} here\n" + "Text. " * 80 + "\n" for n in range(1, 13))
    secs = sections_of(text, heading=r"Module \d+(: .*)?$", min_chars=100)
    assert secs[0]["chapter"] == "Module 1 – Module 10" and secs[11]["chapter"] == "Module 11 – Module 12"
