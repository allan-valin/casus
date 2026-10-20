import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from learn_pl_exam import blocks_of, outline_html  # noqa: E402

TEXT = """    C. OPIS KOMPETENCJI W JĘZYKU POLSKIM JAKO OBCYM NA POZIOMIE ELEMENTARNYM – A1
     2.2. Lista zagadnień gramatycznych

         2.2.1. Fleksja:
                 1) deklinacja:
                    a) odmiana rzeczowników (liczba pojedyncza i mnoga):
                       – odmiana rzeczowników rodzaju męskiego zakończonych na spółgłoskę (np.: pan, profesor,
                         lekarz),
                 2) koniugacja:
                    a) tryby – tryb oznajmujący:
                       – czas teraźniejszy (np.: nazywam się, piszesz),
                                                           – 51 –
Dziennik Ustaw                                             – 60 –                                                     Poz. 217

         2.2.2. Składnia:
                 1) funkcje przypadków:
                    a) mianownik:
                       – jako podmiot (np.: Student czyta książkę.),
     2.3. Coś innego
    D. OPIS KOMPETENCJI W JĘZYKU POLSKIM JAKO OBCYM NA POZIOMIE WSTĘPNYM – A2
     2.2. Lista zagadnień gramatycznych
         2.2.1. Fleksja:
                 1) deklinacja:
                    a) odmiana liczebników zbiorowych (np.: dwoje),
"""


def test_blocks_by_level_part_and_numbered_point_without_page_furniture():
    b = blocks_of(TEXT)
    assert [(x["level"], x["part"], x["title"]) for x in b] == [
        ("A1", "Fleksja", "deklinacja"), ("A1", "Fleksja", "koniugacja"), ("A1", "Składnia", "funkcje przypadków"),
        ("A2", "Fleksja", "deklinacja")]
    assert "Dziennik" not in "".join(l for x in b for l in x["lines"]) and "– 51 –" not in "".join(l for x in b for l in x["lines"])


def test_outline_nests_and_joins_wrapped_lines():
    b = blocks_of(TEXT)[0]
    h = outline_html(b["lines"])
    assert "spółgłoskę (np.: pan, profesor, lekarz)" in h
    assert h.count("<ul") >= 2 and "<li>odmiana rzeczowników (liczba pojedyncza i mnoga):" in h
