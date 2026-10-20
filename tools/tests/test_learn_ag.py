import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from learn_ag import page_of, menu_of, rule_for  # noqa: E402

FIX = Path(__file__).parent / "fixtures" / "ag"


def test_menu_gives_parts_and_pages():
    m = menu_of((FIX / "alphabet.html").read_text(encoding="utf-8"))
    parts = [p for p, _ in m]
    assert "Noun Declensions" in parts
    pages = dict(m)["Noun Declensions"]
    assert pages[0] == ("1st-declension-stem-paradigm-and-gender", "1st Declension: Stem, Paradigm, and Gender")


def test_a_page_keeps_its_numbered_sections():
    p = page_of((FIX / "ablative-degree-difference.html").read_text(encoding="utf-8"))
    assert p["sections"] == ["414"]
    assert "<b>414.</b>" in p["html"] or "<strong>414.</strong>" in p["html"]
    assert "Suggest an Edit" not in p["html"] and "<img" not in p["html"]


def test_rules_from_titles():
    assert rule_for("Ablative of Degree of Difference") == {"seq": [{"pos": ["noun", "adj"], "case": "abl"}], "same": ["number"]}
    assert rule_for("Subjunctive in Purpose Clauses")["seq"][0]["mood"] == "sub"
    assert rule_for("Syllables") is None
