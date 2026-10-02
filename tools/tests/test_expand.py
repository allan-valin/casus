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


def test_adverb_without_comparison_has_one_reading():
    idx = _index()
    cum = [a for a in idx["cum"] if a["pos"] == "adv"]
    assert [a["degree"] for a in cum] == ["pos"]


def test_fully_compared_adverb_takes_its_degree_from_the_stem():
    idx = _index()
    assert [a["degree"] for a in idx["abiecte"] if a["pos"] == "adv"] == ["pos"]
    assert [a["degree"] for a in idx["abiectius"] if a["pos"] == "adv"] == ["comp"]
    assert [a["degree"] for a in idx["abiectissime"] if a["pos"] == "adv"] == ["super"]


def test_comparative_only_adjective_declines_from_its_single_stem():
    idx = _index()
    anteriorem = [a for a in idx["anteriorem"] if a["pos"] == "adj"]
    assert anteriorem and all(a["degree"] == "comp" for a in anteriorem)
    assert ("acc", "sg") in _nominal(anteriorem, "adj")
    assert not any(a["degree"] in ("pos", "super") for a in idx.get("anteri", []) if a["pos"] == "adj")


def test_fully_compared_adjective_builds_comparative_and_superlative():
    idx = _index()
    assert any(a["degree"] == "comp" and a["case"] == "acc" for a in idx["maiorem"] if a["pos"] == "adj")
    assert any(a["degree"] == "super" and a["case"] == "nom" for a in idx["maximus"] if a["pos"] == "adj")
    assert all(a["degree"] == "pos" for a in idx["magnam"] if a["pos"] == "adj")


def _index_with_sum():
    from casus_build.extras import EXTRA_DICTLINE
    lemmas = merge_continuations(parse_dictline(
        (F / "dictline_sample.txt").read_text(encoding="latin-1").splitlines() + EXTRA_DICTLINE))
    rules = parse_inflects((F / "inflects_sample.txt").read_text(encoding="latin-1").splitlines())
    return expand(lemmas, rules)


def _verbs(idx, form):
    return [a for a in idx.get(form, []) if a["pos"] == "verb"]


def test_sum_paradigm_is_built_from_the_empty_stem():
    idx = _index_with_sum()
    est = [a for a in _verbs(idx, "est") if a["conj"] == "5"]
    assert [(a["person"], a["number"], a["tense"], a["mood"], a["voice"]) for a in est] == [("3", "sg", "pres", "ind", "act")]
    assert any(a["person"] == "1" and a["number"] == "pl" for a in _verbs(idx, "sumus"))
    assert any(a["mood"] == "inf" and a["tense"] == "pres" for a in _verbs(idx, "esse"))
    assert any(a["tense"] == "impf" and a["person"] == "3" for a in _verbs(idx, "erat"))
    assert any(a["tense"] == "perf" and a["person"] == "3" for a in _verbs(idx, "fuit"))
    assert "" not in idx and "est" in idx


def test_deponent_has_passive_forms_with_active_voice_and_no_active_forms():
    idx = _index()
    hortatur = _verbs(idx, "hortatur")
    assert hortatur and all(a["voice"] == "act" for a in hortatur)
    assert any(a["person"] == "3" and a["tense"] == "pres" and a["mood"] == "ind" for a in hortatur)
    assert not _verbs(idx, "hortat") and not _verbs(idx, "horto")
    assert any(a["mood"] == "inf" and a["voice"] == "act" for a in _verbs(idx, "hortari"))
    hortans = [a for a in idx["hortans"] if a["pos"] == "vpar"]
    assert hortans and all(a["voice"] == "act" for a in hortans)
    hortatus = [a for a in idx["hortatus"] if a["pos"] == "vpar"]
    assert hortatus and all(a["voice"] == "act" and a["tense"] == "perf" for a in hortatus)


def test_semideponent_keeps_an_active_present_and_a_passive_shaped_perfect():
    idx = _index()
    assert any(a["voice"] == "act" and a["tense"] == "pres" for a in _verbs(idx, "gaudet"))
    assert not _verbs(idx, "gaudetur")
    gauisus = [a for a in idx["gauisus"] if a["pos"] == "vpar"]
    assert gauisus and all(a["voice"] == "act" for a in gauisus)


def test_packons_are_not_expanded_without_their_tackon():
    idx = _index()
    assert not any(":pack:" in a["lemma"] for v in idx.values() for a in v)
    assert any(":pron:" in a["lemma"] for a in idx["quem"])


def test_absent_interior_stem_builds_nothing_but_an_empty_stem_does():
    from casus_build.dictline import Lemma
    from casus_build.inflects import Inflection
    perf = Inflection(pos="verb", decl=0, variant=0, stem_key=3, ending="imus", age="X", freq="A",
                      features={"person": "1", "number": "pl", "tense": "perf", "mood": "ind", "voice": "act"})
    est = Inflection(pos="verb", decl=5, variant=0, stem_key=2, ending="est", age="X", freq="A",
                     features={"person": "3", "number": "sg", "tense": "pres", "mood": "ind", "voice": "act"})
    absent = Lemma(id="abc:verb:1", stems=("abc", "abc", None, "abct"), pos="verb", decl=1, variant=1,
                   conj="1", gender=None, age="X", freq="A", gloss_en="", kind="x")
    empty = Lemma(id="s:verb:2", stems=("s", "", "fu", "fut"), pos="verb", decl=5, variant=1,
                  conj="5", gender=None, age="X", freq="A", gloss_en="", kind="to_being")
    idx = expand([absent, empty], [perf, est])
    assert "imus" not in idx
    assert "est" in idx and "fuimus" in idx


def test_pronoun_nominatives_come_from_their_own_variant_lines():
    # `qu PRON 1 0` holds the shared oblique forms; qui / quis / quae are `qu PRON 1 1 / 1 2 / 1 3`
    idx = _index()
    quem = [a for a in idx["quem"] if a["pos"] == "pron"]
    assert any(a["lemma"] == "qu:pron:91" for a in quem) or any(a["lemma"].startswith("qu:pron:") for a in quem)
    for form in ("qui", "quis", "quae"):
        assert any(a["pos"] == "pron" and a["case"] == "nom" and a["number"] == "sg"
                   and a["lemma"].startswith("qu:pron:") for a in idx[form]), form
    # but a lemma with a variant of its own keeps to it: aliqui (1 1) is not *aliquis
    aliquis = [a for a in idx["aliquis"] if a["case"] == "nom" and a["number"] == "sg"]
    assert aliquis and all(a["lemma"] != "aliqu:pron:4" for a in aliquis)  # :4 is the `1 1` line
