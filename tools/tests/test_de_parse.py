"""Languages phase 3 Task 1: German entries and analyses from the Wiktextract extract."""
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from casus_build.de.parse import parse_entries, analyses_of, build_index  # noqa: E402
from casus_build.de.codes import encode_analysis, decode_analysis  # noqa: E402

LINES = (Path(__file__).parent / "fixtures/de_sample.jsonl").read_text(encoding="utf-8").splitlines()
ENTRIES = {(e["headword"], e["pos"]): e for e in parse_entries(LINES)}
INDEX = build_index(ENTRIES.values())


def has(key, **want):
    return any(all(a.get(k) == v for k, v in want.items()) for a in INDEX.get(key, []))


def test_noun_gender_and_forms():
    assert ENTRIES[("Haus", "noun")]["gender"] == "n"
    assert has("Häuser", pos="noun", case="nom", number="pl", gender="n")
    assert has("Hauses", pos="noun", case="gen", number="sg")
    assert not [k for k in INDEX if " " in k]


def test_adjective_strong_weak_mixed_including_forms_given_only_with_their_article():
    assert has("gutem", pos="adj", case="dat", number="sg", gender="m", infl="strong")
    assert has("guten", pos="adj", case="dat", number="sg", gender="m", infl="weak")
    assert has("besser", pos="adj", degree="comp")


def test_the_article_is_a_determiner_with_every_cell():
    assert has("der", pos="det", case="nom", number="sg", gender="m")
    assert has("der", pos="det", case="gen", number="sg", gender="f")
    assert has("der", pos="det", case="dat", number="sg", gender="f")
    assert has("der", pos="det", case="gen", number="pl")


def test_verbs_tense_and_mood_from_tags():
    assert has("ging", pos="verb", person="1", number="sg", tense="pret", mood="ind")
    assert has("ginge", pos="verb", person="1", number="sg", mood="sub2")
    assert has("geh", pos="verb", person="2", number="sg", mood="imp")
    assert has("gegangen", pos="verb", mood="ppl2")
    assert not has("ging", pos="verb", tense="x", person="0")


def test_prepositions_and_contractions_govern_by_the_grammar_table():
    assert has("in", pos="prep", governs="acc") and has("in", pos="prep", governs="dat")
    assert has("mit", pos="prep", governs="dat")
    assert has("im", pos="prep", governs="dat") and has("ins", pos="prep", governs="acc")


def test_case_is_kept_noun_and_verb_are_different_keys():
    assert has("Essen", pos="noun") and not has("Essen", pos="verb")
    assert has("essen", pos="verb")


def test_codes_round_trip():
    for a in [{"pos": "adj", "case": "dat", "number": "sg", "gender": "m", "infl": "weak", "degree": "pos"},
              {"pos": "verb", "person": "3", "number": "pl", "tense": "pret", "mood": "sub2"},
              {"pos": "det", "case": "gen", "number": "pl", "gender": "x"}, {"pos": "prep", "governs": "acc"}]:
        assert decode_analysis(encode_analysis(a), "1") == {"lemma": "1", **a}


def test_keys_that_cannot_be_words_are_dropped_even_for_uninflected_headwords():
    from casus_build.de.parse import build_index as bi
    idx = bi([{"id": 1, "headword": "e/a", "pos": "adv", "gender": None, "gloss_en": "", "ipa": [], "forms": []},
              {"id": 2, "headword": "E-Mail", "pos": "noun", "gender": "f", "gloss_en": "", "ipa": [], "forms": []}])
    assert "e/a" not in idx and "E-Mail" in idx


def test_single_word_subordinate_clause_forms_of_separable_verbs_are_kept():
    from casus_build.de.parse import analyses_of as an
    e = {"id": 9, "headword": "ansehen", "pos": "verb", "gender": None, "gloss_en": "", "ipa": [], "forms": [
        {"form": "ansah", "tags": ["first-person", "indicative", "preterite", "singular", "subordinate-clause"]},
        {"form": "dass ich ansah", "tags": ["first-person", "indicative", "preterite", "singular", "subordinate-clause"]},
        {"form": "sah an", "tags": ["first-person", "indicative", "preterite", "singular"]}]}
    got = [(f, a["tense"]) for f, a in an(e)]
    assert ("ansah", "pret") in got
    assert all(" " not in f for f, _ in got)


TABLE = [{"form": "ich", "tags": ["first-person", "nominative", "personal", "pronoun", "singular"]},
         {"form": "er", "tags": ["masculine", "nominative", "personal", "pronoun", "singular", "third-person"]},
         {"form": "ihm", "tags": ["dative", "masculine", "personal", "pronoun", "singular", "third-person"]},
         {"form": "mir", "tags": ["dative", "first-person", "personal", "pronoun", "singular"]},
         {"form": "sie", "tags": ["feminine", "nominative", "personal", "pronoun", "singular", "third-person"]},
         {"form": "sie", "tags": ["nominative", "personal", "plural", "pronoun", "third-person"]},
         {"form": "ihnen", "tags": ["dative", "personal", "plural", "pronoun", "third-person"]}]


def test_a_personal_pronoun_keeps_only_its_own_rows_of_the_shared_table():
    from casus_build.de.parse import analyses_of as an
    er = {"id": 1, "headword": "er", "pos": "pron", "gender": None, "gloss_en": "", "ipa": [], "forms": TABLE}
    assert sorted({f for f, _ in an(er)}) == ["er", "ihm"]
    sie = {"id": 2, "headword": "sie", "pos": "pron", "gender": None, "gloss_en": "", "ipa": [], "forms": TABLE}
    assert sorted({f for f, _ in an(sie)}) == ["ihnen", "sie"]


def test_the_article_table_belongs_to_der_alone():
    index = build_index(ENTRIES.values())
    assert {a["lemma"] for a in index["dem"] if a["pos"] == "det"} == {ENTRIES[("der", "det")]["id"]}


def test_lowercase_noun_forms_are_not_nouns():
    from casus_build.de.parse import analyses_of as an
    e = {"id": 3, "headword": "E", "pos": "noun", "gender": "n", "gloss_en": "the letter E", "ipa": [], "forms": [
        {"form": "es", "tags": ["nominative", "plural"]}, {"form": "Es", "tags": ["nominative", "plural"]}]}
    assert [f for f, _ in an(e)] == ["Es"]


def test_a_pronoun_page_without_its_own_row_in_the_shared_table_takes_none_of_it():
    from casus_build.de.parse import analyses_of as an
    du = {"id": 4, "headword": "Du", "pos": "pron", "gender": None, "gloss_en": "", "ipa": [], "forms": TABLE}
    assert {f for f, _ in an(du)} == {"Du"}
