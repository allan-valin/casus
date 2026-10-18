"""CMP (Allan, 2026-10-18): German compounds split into dictionary roots, each drawn in its own ink."""
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from casus_build.de.compounds import split_compound  # noqa: E402

NOUNS = {"sprache", "mutter", "schiff", "dampf", "haus", "tür", "tag", "geburt", "hacker", "holz", "arbeit", "zimmer"}
OTHER = {"groß", "donau", "schreib", "klein"}


def test_two_roots():
    assert split_compound("Muttersprache", NOUNS, OTHER) == ["Mutter", "sprache"]


def test_three_roots_and_an_adjective_first():
    assert split_compound("Donaudampfschiff", NOUNS, OTHER) == ["Donau", "dampf", "schiff"]
    assert split_compound("Großmutter", NOUNS, OTHER) == ["Groß", "mutter"]


def test_linking_letters_stay_with_the_part_before():
    assert split_compound("Geburtstag", NOUNS, OTHER) == ["Geburts", "tag"]
    assert split_compound("Arbeitszimmer", NOUNS, OTHER) == ["Arbeits", "zimmer"]


def test_a_simple_word_is_not_split():
    assert split_compound("Haus", NOUNS, OTHER) is None
    assert split_compound("Kaffee", NOUNS, OTHER) is None


def test_a_linking_letter_wins_over_a_rare_noun_that_starts_with_it():
    assert split_compound("Geburtstag", NOUNS | {"stag"}, OTHER) == ["Geburts", "tag"]
