"""Languages plan Task 11: Ancient Greek entries and analyses from the Wiktextract extract."""
from pathlib import Path

import sys; sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from casus_build.grc.parse import parse_entries, analyses_of, build_index
from casus_build.grc.normalize import normalize_grc, strip_grc

LINES = (Path(__file__).parent / "fixtures/grc_sample.jsonl").read_text(encoding="utf-8").splitlines()
ENTRIES = {(e["headword"], e["pos"]): e for e in parse_entries(LINES)}


def test_a_noun_entry_carries_gender_class_gloss_and_ipa_by_period():
    e = ENTRIES[("λόγος", "noun")]
    assert e["gender"] == "m"
    assert e["decl"] == "2"
    assert e["gloss_en"].startswith("that which is said")
    tags = [v["tags"] for v in e["ipa"]]
    assert ["5th BCE Attic"] in tags and ["4th CE Koine"] in tags


def test_noun_forms_get_case_and_number_and_the_entry_gender():
    e = ENTRIES[("λόγος", "noun")]
    got = {(normalize_grc(f), a["case"], a["number"], a["gender"]) for f, a in analyses_of(e)}
    assert ("λόγου", "gen", "sg", "m") in got
    assert ("λόγω", "nom", "du", "m") in got or ("λόγω", "acc", "du", "m") in got


def test_verb_forms_take_tense_from_their_table_and_voice_middle_passive_as_mp():
    e = ENTRIES[("λύω", "verb")]
    got = {(normalize_grc(f), a["person"], a["number"], a["tense"], a["mood"], a["voice"]) for f, a in analyses_of(e) if a["pos"] == "verb"}
    assert ("λύομεν", "1", "pl", "pres", "ind", "act") in got
    assert ("ἐλύομεν", "1", "pl", "impf", "ind", "act") in got
    assert ("λυόμεθα", "1", "pl", "pres", "ind", "mp") in got
    assert any(t == "aor" and f.startswith("ἔλυσ") for f, _, _, t, _, _ in got)


def test_a_participle_is_nominal_with_tense_and_voice():
    e = ENTRIES[("λύω", "verb")]
    parts = [(normalize_grc(f), a) for f, a in analyses_of(e) if a["pos"] == "vpar"]
    assert ("λύων", {"pos": "vpar", "case": "nom", "number": "sg", "gender": "m", "tense": "pres", "voice": "act"}) in parts


def test_the_article_is_a_determiner_with_syncretic_cells_split():
    e = ENTRIES[("ὁ", "det")]
    got = {(normalize_grc(f), a["case"], a["number"], a["gender"]) for f, a in analyses_of(e)}
    assert ("τοῦ", "gen", "sg", "m") in got and ("τοῦ", "gen", "sg", "n") in got
    assert ("ἡ", "nom", "sg", "f") in got


def test_index_has_marked_keys_only_the_page_matches_unaccented_input_in_the_shard():
    index = build_index(ENTRIES.values())
    assert any(a["pos"] == "noun" and a["case"] == "gen" for a in index["λόγου"])
    assert strip_grc("λόγου") not in index


def test_uninflected_words_index_their_headword():
    index = build_index(ENTRIES.values())
    assert any(a["pos"] == "prep" for a in index["ἐν"])
    assert any(a["pos"] == "conj" for a in index["καί"])


def test_movable_nu_written_in_parentheses_gives_both_forms():
    index = build_index(ENTRIES.values())
    assert any(a["pos"] == "verb" and a["person"] == "3" for a in index["ἐστί"])
    assert any(a["pos"] == "verb" and a["person"] == "3" for a in index["ἐστίν"])
    assert not any("(" in k for k in index)


def test_romanizations_and_forms_with_apostrophes_or_spaces_stay_out_of_the_index():
    index = build_index(ENTRIES.values())
    import re
    assert not [k for k in index if not re.search(r"[Ͱ-Ͽἀ-῿]", k)]
    assert not [k for k in index if re.search(r"[ '’]", k)]


def test_gender_comes_from_the_headword_template_when_the_senses_do_not_tag_it():
    assert ENTRIES[("ἀρχή", "noun")]["gender"] == "f"


def test_dictionary_form_drops_length_marks():
    from build_lang import _dict_form
    assert _dict_form(ENTRIES[("ἀρχή", "noun")]) == "ἀρχή, ἀρχῆς f."
