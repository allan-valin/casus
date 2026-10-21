"""Serbo-Croatian keys (2026-10-21): tone and length marks go, the letters ć č š ž stay, in both scripts."""
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from casus_build.sh import strip_sh  # noqa: E402


def test_marks_on_vowels_go():
    assert strip_sh("kȕća") == "kuća"
    assert strip_sh("kȕćē") == "kuće"
    assert strip_sh("čìtati") == "čitati"
    assert strip_sh("ку̏ћа") == "кућа"
    assert strip_sh("vȑh") == "vrh"


def test_consonant_letters_stay():
    assert strip_sh("Ćuprija") == "ćuprija"
    assert strip_sh("žȅna") == "žena"
    assert strip_sh("šúma") == "šuma"
    assert strip_sh("đak") == "đak"
