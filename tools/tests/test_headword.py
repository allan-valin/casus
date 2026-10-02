from pathlib import Path

from casus_build.dictline import merge_continuations, parse_dictline
from casus_build.headword import lemma_record
from casus_build.inflects import parse_inflects

F = Path(__file__).parent / "fixtures"


def _records():
    lemmas = merge_continuations(
        parse_dictline((F / "dictline_sample.txt").read_text(encoding="latin-1").splitlines())
    )
    rules = parse_inflects((F / "inflects_sample.txt").read_text(encoding="latin-1").splitlines())
    return {l.id: lemma_record(l, rules) for l in lemmas}


def _one(records, **want):
    [r] = [r for r in records.values() if all(r.get(k) == v for k, v in want.items())]
    return r


def test_noun_headword_is_nominative_singular_with_genitive_ending():
    rosa = _one(_records(), headword="rosa", pos="noun")
    assert rosa["dict_form"] == "rosa, -ae f."
    assert rosa["decl"] == 1 and rosa["gender"] == "f"
    seruus = _one(_records(), headword="seruus")
    assert seruus["dict_form"] == "seruus, -i m."
    urbs = _one(_records(), headword="urbs")
    assert urbs["dict_form"] == "urbs, -is f."


def test_adjective_headword_lists_the_three_genders():
    magnus = _one(_records(), headword="magnus")
    assert magnus["dict_form"] == "magnus, -a, -um"
    assert magnus["pos"] == "adj"


def test_verb_headword_is_first_person_present_with_infinitive():
    amo = _one(_records(), headword="amo", conj="1")
    assert amo["dict_form"] == "amo, -are"
    capio = _one(_records(), headword="capio")
    assert capio["dict_form"] == "capio, -ere" and capio["conj"] == "3-io"
    audio = _one(_records(), headword="audio")
    assert audio["dict_form"] == "audio, -ire" and audio["conj"] == "4"


def test_uninflected_word_is_its_own_headword():
    et = _one(_records(), pos="conj")
    assert et["headword"] == "et" and et["dict_form"] == "et"
    ins = [r for r in _records().values() if r["pos"] == "prep" and r["headword"] == "in"]
    assert {r["governs"] for r in ins} == {"acc", "abl"}


def test_record_carries_age_and_freq_and_no_gloss():
    rosa = _one(_records(), headword="rosa", pos="noun")
    assert rosa["age"] == "X" and rosa["freq"] == "B"
    assert "gloss_en" not in rosa and "gloss" not in rosa


def test_lemma_with_no_matching_rule_falls_back_to_its_first_stem():
    amass = _one(_records(), conj="8", headword="am")
    assert amass["headword"] == "am"
