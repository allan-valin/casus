"""Core plan Task 8: Portuguese glosses from the Portuguese Wiktionary (Wiktextract JSONL)."""
from casus_build.glosses import build_pt_glosses, gloss_coverage

LEMMAS = {
    "33803": {"headword": "rosa", "pos": "noun", "freq": "B"},
    "100": {"headword": "urbs", "pos": "noun", "freq": "A"},
    "200": {"headword": "amo", "pos": "verb", "freq": "A"},
    "300": {"headword": "Rosa", "pos": "noun", "freq": "D"},   # a second Whitaker entry, same headword
    "400": {"headword": "lingua", "pos": "noun", "freq": "A"},
}

JSONL = [
    '{"word": "rosa", "lang_code": "la", "pos": "noun", "senses": [{"glosses": ["rosa"], "raw_tags": ["flor"]}, {"glosses": ["rosa, roseira"]}]}',
    '{"word": "canis", "lang_code": "la", "pos": "noun", "senses": [{"glosses": ["cão"]}]}',
    '{"word": "rose", "lang_code": "en", "pos": "noun", "senses": [{"glosses": ["flor"]}]}',
    '{"word": "amō", "lang_code": "la", "pos": "verb", "senses": [{"glosses": ["amar"]}, {"glosses": ["gostar de"]}]}',
    '{"word": "urbs", "lang_code": "la", "pos": "verb", "senses": [{"glosses": ["errado: outra classe"]}]}',
    '{"word": "lingua", "lang_code": "la", "pos": "noun", "senses": [{"glosses": ["língua"]}, {"glosses": ["vocativo singular de lingua"]}, {"glosses": ["ablativo singular de lingua"], "form_of": [{"word": "lingua"}]}]}',
]


def test_matches_latin_entries_by_headword_and_pos():
    glosses = build_pt_glosses(JSONL, LEMMAS)
    assert glosses["33803"].startswith("rosa")
    assert glosses["200"] == "amar; gostar de"          # senses joined like Whitaker's English


def test_macrons_and_case_are_normalised_for_the_join():
    glosses = build_pt_glosses(JSONL, LEMMAS)
    assert "200" in glosses                              # amō ↔ amo
    assert glosses["300"] == glosses["33803"]            # Rosa ↔ rosa: every entry with that headword


def test_ignores_non_latin_entries_and_pos_mismatches():
    glosses = build_pt_glosses(JSONL, LEMMAS)
    assert all("flor" not in g for g in glosses.values())
    assert "100" not in glosses                          # urbs is only there as a verb


def test_inflected_form_senses_are_dropped():
    # pt.wiktionary files "vocativo singular de lingua" as a sense of the headword; that is not a meaning
    assert build_pt_glosses(JSONL, LEMMAS)["400"] == "língua"


def test_missing_lemmas_are_absent_not_empty():
    glosses = build_pt_glosses(JSONL, LEMMAS)
    assert "100" not in glosses
    assert all(g for g in glosses.values())


def test_coverage_is_reported_overall_and_for_common_words():
    glosses = build_pt_glosses(JSONL, LEMMAS)
    overall, common = gloss_coverage(glosses, LEMMAS)
    assert overall == 0.8                                # 4 of 5 lemma records
    assert common == 0.75                                # of the freq A–C records (rosa, urbs, amo, lingua), three are glossed


def test_coverage_counts_only_frequency_a_to_c_as_common():
    glosses = {"33803": "rosa"}
    overall, common = gloss_coverage(glosses, LEMMAS)
    assert overall == 0.2
    assert common == 0.25
