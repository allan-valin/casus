"""Core plan Task 8: Portuguese glosses from the Portuguese Wiktionary (Wiktextract JSONL)."""
from casus_build.glosses import build_pt_glosses, gloss_coverage

LEMMAS = {
    "33803": {"headword": "rosa", "pos": "noun", "freq": "B"},
    "100": {"headword": "urbs", "pos": "noun", "freq": "A"},
    "200": {"headword": "amo", "pos": "verb", "freq": "A"},
    "300": {"headword": "Rosa", "pos": "noun", "freq": "D"},   # a second Whitaker entry, same headword
}

JSONL = [
    '{"word": "rosa", "lang_code": "la", "pos": "noun", "senses": [{"glosses": ["rosa"], "raw_tags": ["flor"]}, {"glosses": ["rosa, roseira"]}]}',
    '{"word": "canis", "lang_code": "la", "pos": "noun", "senses": [{"glosses": ["cão"]}]}',
    '{"word": "rose", "lang_code": "en", "pos": "noun", "senses": [{"glosses": ["flor"]}]}',
    '{"word": "amō", "lang_code": "la", "pos": "verb", "senses": [{"glosses": ["amar"]}, {"glosses": ["gostar de"]}]}',
    '{"word": "urbs", "lang_code": "la", "pos": "verb", "senses": [{"glosses": ["errado: outra classe"]}]}',
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


def test_missing_lemmas_are_absent_not_empty():
    glosses = build_pt_glosses(JSONL, LEMMAS)
    assert "100" not in glosses
    assert all(g for g in glosses.values())


def test_coverage_is_reported_overall_and_for_common_words():
    glosses = build_pt_glosses(JSONL, LEMMAS)
    overall, common = gloss_coverage(glosses, LEMMAS)
    assert overall == 0.75                               # 3 of 4 lemma records
    assert common == 2 / 3                               # of the freq A–C records (rosa B, urbs A, amo A), two are glossed


def test_coverage_counts_only_frequency_a_to_c_as_common():
    glosses = {"33803": "rosa"}
    overall, common = gloss_coverage(glosses, LEMMAS)
    assert overall == 0.25
    assert common == 1 / 3
