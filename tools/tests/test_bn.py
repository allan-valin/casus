"""Bengali noun endings (2026-10-21): regular, generated for nouns the dictionary gives without a table."""
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from casus_build.bn import noun_forms  # noqa: E402


def test_consonant_final():
    got = {(f, a["case"], a["number"]) for f, a in noun_forms("বই")}
    assert ("বইকে", "obj", "sg") in got and ("বইটা", "nom", "sg") in got and ("বইগুলো", "nom", "pl") in got


def test_vowel_and_consonant_endings():
    got = {(f, a["case"]) for f, a in noun_forms("টেবিল")}
    assert ("টেবিলের", "gen") in got and ("টেবিলে", "loc") in got
    got = {(f, a["case"]) for f, a in noun_forms("বাড়ি")}
    assert ("বাড়ির", "gen") in got and ("বাড়িতে", "loc") in got
