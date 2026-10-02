from pathlib import Path

from casus_build.dictline import merge_continuations, parse_dictline
from casus_build.expand import expand
from casus_build.inflects import parse_inflects

F = Path(__file__).parent / "fixtures"


def _index():
    lemmas = merge_continuations(
        parse_dictline((F / "dictline_sample.txt").read_text(encoding="latin-1").splitlines())
    )
    rules = parse_inflects((F / "inflects_sample.txt").read_text(encoding="latin-1").splitlines())
    return expand(lemmas, rules)


def _nominal(analyses, pos="noun"):
    return {(a["case"], a["number"]) for a in analyses if a["pos"] == pos}


def test_rosam_is_accusative_singular():
    analyses = _index()["rosam"]
    assert any(
        a["case"] == "acc" and a["number"] == "sg" and a["pos"] == "noun" for a in analyses
    )


def test_rosa_keeps_every_syncretic_reading():
    cases = _nominal(_index()["rosa"])
    assert ("nom", "sg") in cases
    assert ("abl", "sg") in cases
    assert ("voc", "sg") in cases


def test_keys_are_normalised():
    for key in _index():
        assert key == key.lower()
        assert "v" not in key and "j" not in key


def test_no_empty_analysis_lists():
    assert all(analyses for analyses in _index().values())


def test_noun_analysis_carries_the_lemma_gender_and_id():
    [a] = [a for a in _index()["rosam"] if a["pos"] == "noun"]
    assert a["gender"] == "f"
    assert a["lemma"].startswith("ros:noun:")
    assert set(a) == {"lemma", "pos", "case", "number", "gender"}


def test_variant_zero_rules_apply_to_every_variant():
    # dat sg / nom pl / voc pl of rosa come from N 1 0 rules, gen sg from N 1 1
    assert {("gen", "sg"), ("dat", "sg"), ("nom", "pl"), ("voc", "pl")} <= _nominal(_index()["rosae"])


def test_rule_gender_must_fit_the_lemma():
    # N 2 2 ... N rules (bellum: nom sg -um) must not produce *servum as a nominative of servus (m)
    servus = [a for a in _index()["seruum"] if a["pos"] == "noun" and a["gender"] == "m"]
    assert servus, "servus must reach seruum as acc sg"
    assert ("nom", "sg") not in _nominal(servus)
    # and the neuter rules do serve bellum
    assert ("nom", "sg") in _nominal([a for a in _index()["bellum"] if a["gender"] == "n"])


def test_adjective_takes_gender_from_the_rule():
    magnam = [a for a in _index()["magnam"] if a["pos"] == "adj"]
    assert {(a["case"], a["number"], a["gender"]) for a in magnam} == {("acc", "sg", "f")}
    assert magnam[0]["degree"] == "pos"


def test_verb_forms_from_each_stem():
    idx = _index()
    amat = [a for a in idx["amat"] if a["pos"] == "verb"]
    assert any(a["person"] == "3" and a["number"] == "sg" and a["tense"] == "pres"
               and a["mood"] == "ind" and a["voice"] == "act" and a["conj"] == "1" for a in amat)
    assert any(a["tense"] == "perf" and a["person"] == "3" for a in idx["cepit"] if a["pos"] == "verb")
    assert any(a["person"] == "1" and a["tense"] == "pres" and a["conj"] == "3-io"
               for a in idx["capio"] if a["pos"] == "verb")
    assert any(a["conj"] == "4" and a["person"] == "3" for a in idx["audit"] if a["pos"] == "verb")


def test_absent_stem_produces_nothing():
    # `am am amass zzz V 8 1`: no V 8 rules in the fixture, and no stem 4 — nothing may be built on "".
    assert not any(a["lemma"].endswith(":verb:14") and a["tense"] == "perf" for a in _index().get("it", []))
    assert "" not in _index()


def test_preposition_carries_what_it_governs():
    ins = [a for a in _index()["in"] if a["pos"] == "prep"]
    assert {a["governs"] for a in ins} == {"acc", "abl"}


def test_identical_analyses_are_not_duplicated():
    for key, analyses in _index().items():
        seen = [tuple(sorted(a.items())) for a in analyses]
        assert len(seen) == len(set(seen)), key
