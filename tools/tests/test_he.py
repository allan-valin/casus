"""Hebrew (2026-10-21): Wiktionary writes forms with vowel points; texts are written without them and in full
spelling (ktiv male), where vowels the points showed become ו and י. Keys drop the points; every pointed form also
gets its full spelling, after the Academy's rules."""
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from casus_build.he import plene, strip_he  # noqa: E402


def test_points_go():
    assert strip_he("כָּתַבְתִּי") == "כתבתי"
    assert strip_he("הַיֶּלֶד") == "הילד"
    assert strip_he("יַלְדֵי־") == "ילדי"
    assert strip_he("שָׁלוֹם") == "שלום"


def test_full_spelling():
    assert plene("יִכְתֹּב") == "יכתוב"          # holam → ו
    assert plene("כֻּלָּם") == "כולם"            # qubuts → ו
    assert plene("דִּבֵּר") == "דיבר"            # hiriq in an open syllable → י
    assert plene("לִכְתֹּב") == "לכתוב"          # hiriq before a shva: no י
    assert plene("אִם") == "אם"                  # closed final syllable: no י
    assert plene("מִצְוָה") == "מצווה"           # consonantal vav inside a word doubled
    assert plene("שָׁלוֹם") == "שלום"            # already full
    assert plene("כּוֹתֵב") == "כותב"
    assert plene("וְלָדִים") == "ולדים"          # a vav at the start is not doubled
