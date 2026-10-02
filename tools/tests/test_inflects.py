from pathlib import Path

from casus_build.inflects import Inflection, parse_inflects

FIXTURE = Path(__file__).parent / "fixtures" / "inflects_sample.txt"


def _rules():
    return parse_inflects(FIXTURE.read_text(encoding="latin-1").splitlines())


def test_skips_comments_and_blanks():
    raw = FIXTURE.read_text(encoding="latin-1").splitlines()
    meaningful = [l for l in raw if l.strip() and not l.startswith("--")]
    assert len(_rules()) == len(meaningful)
    assert parse_inflects(["", "   ", "-- comment", "   --  indented comment"]) == []


def test_nominal_rule_carries_case_and_number():
    noun_rules = [r for r in _rules() if r.pos == "noun"]
    assert noun_rules, "fixture must contain noun inflections"
    r = noun_rules[0]
    assert r.features["case"] in {"nom", "gen", "dat", "acc", "abl", "voc", "loc"}
    assert r.features["number"] in {"sg", "pl"}


def test_endings_are_normalised_for_lookup():
    for r in _rules():
        assert r.ending == r.ending.lower()
        assert "v" not in r.ending and "j" not in r.ending


def test_first_declension_accusative_singular():
    [r] = [r for r in _rules() if r.pos == "noun" and r.decl == 1 and r.variant == 1
           and r.features["case"] == "acc" and r.features["number"] == "sg"]
    assert r.ending == "am"
    assert r.stem_key == 2
    assert r.features["gender"] == "c"
    assert r.age == "X" and r.freq == "A"


def test_zero_length_ending_is_empty_string():
    bare = [r for r in _rules() if r.pos == "noun" and r.decl == 3 and r.variant == 0
            and r.features["case"] == "nom" and r.features["number"] == "sg"]
    assert bare and all(r.ending == "" for r in bare)
    assert all(r.stem_key == 1 for r in bare)


def test_trailing_comment_is_cut_off():
    [r] = parse_inflects(["PREP   GEN 1 0       X A    --  Prepositional Substantive"])
    assert r.pos == "prep" and r.ending == "" and r.features == {"governs": "gen"}


def test_verb_rule_features():
    [r] = parse_inflects(["V     1 1 PRES  ACTIVE  IND  2 S  2 2 as            X A"])
    assert r.pos == "verb" and r.decl == 1 and r.variant == 1
    assert r.features == {"tense": "pres", "voice": "act", "mood": "ind", "person": "2", "number": "sg"}
    assert r.stem_key == 2 and r.ending == "as"


def test_participle_rule_features():
    [r] = parse_inflects(["VPAR 1 0 NOM S X PRES ACTIVE  PPL 1 3 ans          X A"])
    assert r.pos == "vpar"
    assert r.features == {"case": "nom", "number": "sg", "gender": "x", "tense": "pres", "voice": "act", "mood": "ppl"}


def test_adjective_rule_carries_comparison():
    [r] = parse_inflects(["ADJ   1 1 NOM S M POS   1 2 us    X A"])
    assert r.pos == "adj"
    assert r.features == {"case": "nom", "number": "sg", "gender": "m", "degree": "pos"}


def test_unknown_part_of_speech_raises():
    import pytest
    with pytest.raises(ValueError, match="XYZZY"):
        parse_inflects(["XYZZY 1 0 X A"])
