import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from learn_pdfbook import clean_layout  # noqa: E402

PAGE = """Module 11
The Definite Article and Persistent
Accent


The Definite Article
In Greek the article is an adjective.


© 2021 Philip S. Peek, CC BY 4.0                     https://doi.org/10.11647/OBP.0264.12
\f128\x08                                       Ancient Greek I


       Memorize the forms.

               N      ὁ       ἡ      τό
                    Module 11 | The Definite Article and Persistent Accent           129
\f
Module 12
Substantive Adjectives

Body.

Appendix
Answers.
"""


def test_clean_layout_drops_running_heads_and_joins_the_module_title():
    t = clean_layout(PAGE, heading=r"Module \d+", drop=[r"©.*CC BY", r"^\d+\s+Ancient Greek I$", r"^Module \d+ \|.*\d+$"], stop="Appendix")
    lines = [x for x in t.splitlines() if x.strip()]
    assert lines[0] == "Module 11: The Definite Article and Persistent Accent"
    assert "Memorize the forms." in lines and not any("©" in x or "Ancient Greek I" in x or "|" in x for x in lines)
    assert any(x.startswith("  ") and "ὁ" in x for x in lines)      # a table stays indented (to_html keeps it as <pre>)
    assert "Module 12: Substantive Adjectives" in lines and "Answers." not in t


def test_a_double_spaced_table_stays_one_block():
    t = clean_layout("Text.\n\n        M   F\n\n   N    ὁ   ἡ\n\n   A    τόν τήν\n\nMore text.\n", heading=r"Module \d+", drop=[])
    assert "        M   F\n   N    ὁ   ἡ\n   A    τόν τήν\n" in t and "\n\nMore text." in t
