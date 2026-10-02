from pathlib import Path

import pytest

from casus_build.dictline import Lemma, merge_continuations, parse_dictline

FIXTURE = Path(__file__).parent / "fixtures" / "dictline_sample.txt"


def _lemmas():
    return parse_dictline(FIXTURE.read_text(encoding="latin-1").splitlines())


def test_parses_every_fixture_line():
    lemmas = _lemmas()
    assert len(lemmas) == len(FIXTURE.read_text(encoding="latin-1").splitlines())


def test_first_declension_noun_has_gender_and_declension():
    rosa = next(l for l in _lemmas() if l.stems[0] == "ros" and l.pos == "noun" and l.decl == 1)
    assert rosa.decl == 1
    assert rosa.variant == 1
    assert rosa.gender == "f"
    assert "rose" in rosa.gloss_en.lower()
    assert rosa.age == "X"
    assert rosa.freq == "B"


def test_io_verb_is_marked_as_third_io():
    capio = next(l for l in _lemmas() if l.pos == "verb" and l.stems[0] == "capi" and l.decl == 3)
    assert capio.conj == "3-io"
    assert capio.stems == ("capi", "cap", "cep", "capt")


def test_plain_third_and_fourth_conjugation():
    rego = next(l for l in _lemmas() if l.pos == "verb" and l.stems[0] == "reg")
    assert rego.conj == "3"
    audio = next(l for l in _lemmas() if l.pos == "verb" and l.stems[0] == "audi")
    assert audio.conj == "4"
    assert audio.decl == 3 and audio.variant == 4


def test_absent_stems_are_dropped_not_kept_as_zzz():
    amass = next(l for l in _lemmas() if l.pos == "verb" and l.stems[0] == "am" and l.decl == 8)
    assert amass.stems == ("am", "am", "amass")


def test_preposition_records_the_case_it_governs():
    ins = [l for l in _lemmas() if l.pos == "prep" and l.stems[0] == "in"]
    assert {l.governs for l in ins} == {"abl", "acc"}
    assert all(l.decl is None and l.gender is None and l.conj is None for l in ins)


def test_adjective_has_declension_and_no_gender():
    magn = next(l for l in _lemmas() if l.pos == "adj" and l.stems[0] == "magn")
    assert magn.decl == 1 and magn.variant == 1
    assert magn.gender is None
    assert magn.stems == ("magn", "magn", "mai", "maxi")


def test_ids_are_unique():
    lemmas = _lemmas()
    assert len({l.id for l in lemmas}) == len(lemmas)


def test_unparseable_line_raises_naming_it():
    with pytest.raises(ValueError, match="XYZZY"):
        parse_dictline(["XYZZY"])


def test_continuation_lines_merge_into_the_lemma_above():
    merged = merge_continuations(_lemmas())
    magn = [l for l in merged if l.stems[0] == "magn" and l.pos == "adj"]
    assert len(magn) == 1
    assert "great" in magn[0].gloss_en and "full" in magn[0].gloss_en
    assert not magn[0].gloss_en.startswith("|")
    assert len(merged) < len(_lemmas())


def test_interior_absent_stem_keeps_its_slot():
    deponent = [l for l in _lemmas() if l.stems[0] == "domin" and l.pos == "verb" and "" in l.stems]
    assert [l.stems for l in deponent] == [("domin", "domin", "", "dominat")]
