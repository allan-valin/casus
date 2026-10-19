import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from build_corpus import sentences_of_tei  # noqa: E402

TEI = """<TEI><text><body><div type="book"><p><milestone unit="section" n="1"/>Δαρείου καὶ Παρυσάτιδος γίγνονται παῖδες δύο,
πρεσβύτερος μὲν Ἀρταξέρξης, νεώτερος δὲ Κῦρος<note>a note</note>· ἐπεὶ δὲ ἠσθένει Δαρεῖος καὶ ὑπώπτευε τελευτὴν τοῦ βίου,
ἐβούλετο τὼ παῖδε ἀμφοτέρω παρεῖναι. τί ποιεῖς;</p></div></body></text></TEI>"""


def test_sentences_from_a_tei_text():
    s = sentences_of_tei(TEI)
    assert s[0] == "Δαρείου καὶ Παρυσάτιδος γίγνονται παῖδες δύο, πρεσβύτερος μὲν Ἀρταξέρξης, νεώτερος δὲ Κῦρος·"
    assert s[1].startswith("ἐπεὶ δὲ ἠσθένει") and s[1].endswith("παρεῖναι.")
    assert "a note" not in " ".join(s)
    assert "τί ποιεῖς;" not in s          # too short: fewer than four words
