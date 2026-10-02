from pathlib import Path

from casus_build.expand import add_uniques
from casus_build.uniques import parse_uniques

FIXTURE = Path(__file__).parent / "fixtures" / "uniques_sample.txt"


def _uniques():
    return parse_uniques(FIXTURE.read_text(encoding="latin-1").splitlines())


def test_every_three_line_record_becomes_one_unique():
    lines = [l for l in FIXTURE.read_text(encoding="latin-1").splitlines() if l.strip()]
    assert len(_uniques()) == len(lines) // 3


def test_verb_unique_carries_a_full_verb_analysis():
    vult = next(u for u in _uniques() if u.form == "uult")
    assert vult.lemma.pos == "verb" and vult.lemma.kind == "x"
    assert vult.analysis == {"lemma": vult.lemma.id, "pos": "verb", "person": "3", "number": "sg",
                             "tense": "pres", "mood": "ind", "voice": "act", "conj": vult.lemma.conj}
    assert "want" in vult.lemma.gloss_en or "wish" in vult.lemma.gloss_en


def test_nominal_unique_carries_case_number_gender():
    dii = next(u for u in _uniques() if u.form == "dii")
    assert dii.lemma.pos == "noun"
    assert dii.analysis["case"] in {"nom", "voc"} and dii.analysis["number"] == "pl" and dii.analysis["gender"] == "m"
    quisquis = next(u for u in _uniques() if u.form == "quisquis")
    assert quisquis.analysis["pos"] == "pron" and quisquis.analysis["case"] == "nom"


def test_unique_lemma_ids_do_not_collide_with_dictline_line_numbers():
    ids = [int(u.lemma.id.rsplit(":", 1)[1]) for u in _uniques()]
    assert min(ids) >= 100000 and len(set(ids)) == len(ids)


def test_add_uniques_puts_forms_in_the_index_without_duplicates():
    index = {"uult": [{"lemma": "x:verb:1", "pos": "verb", "person": "3", "number": "sg",
                        "tense": "pres", "mood": "ind", "voice": "act", "conj": "3"}]}
    uniques = _uniques()
    add_uniques(index, uniques)
    assert len(index["uult"]) == 2
    add_uniques(index, uniques)
    assert len(index["uult"]) == 2
    assert "memento" in index and index["memento"][0]["mood"] == "imp"
