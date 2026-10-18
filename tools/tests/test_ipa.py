"""Languages plan Task 6: IPA per lemma from a Wiktextract extract, own CC BY-SA file."""
from casus_build.ipa import build_ipa, ipa_coverage

LEMMAS = {
    "33803": {"headword": "rosa", "pos": "noun"},
    "500": {"headword": "amo", "pos": "verb"},
    "600": {"headword": "urbs", "pos": "noun"},
}
JSONL = [
    '{"word": "rosa", "lang_code": "la", "pos": "noun", "sounds": [{"tags": ["Classical-Latin"], "ipa": "[ˈrɔ.sa]"}, {"note": "modern Italianate Ecclesiastical", "ipa": "[ˈrɔː.za]"}, {"audio": "x.ogg"}]}',
    '{"word": "amō", "lang_code": "la", "pos": "verb", "sounds": [{"tags": ["Classical-Latin"], "ipa": "[ˈa.moː]"}, {"tags": ["Classical-Latin"], "ipa": "[ˈa.moː]"}]}',
    '{"word": "urbs", "lang_code": "la", "pos": "noun", "sounds": []}',
    '{"word": "rosa", "lang_code": "it", "pos": "noun", "sounds": [{"ipa": "/ˈrɔ.za/"}]}',
    '{"word": "rosā", "lang_code": "la", "pos": "noun", "sounds": [{"tags": ["Classical-Latin"], "ipa": "[ˈrɔ.saː]"}], "senses": [{"form_of": [{"word": "rosa"}], "glosses": ["ablative singular of rosa"]}]}',
]


def test_keeps_every_variant_with_its_tags_and_drops_audio_only_entries():
    ipa = build_ipa(JSONL, LEMMAS, lang_code="la")
    assert ipa["33803"] == [
        {"ipa": "[ˈrɔ.sa]", "tags": ["Classical-Latin"]},
        {"ipa": "[ˈrɔː.za]", "tags": ["Ecclesiastical"]},
    ]


def test_joins_on_normalised_headword_and_pos_and_deduplicates():
    ipa = build_ipa(JSONL, LEMMAS, lang_code="la")
    assert ipa["500"] == [{"ipa": "[ˈa.moː]", "tags": ["Classical-Latin"]}]


def test_lemmas_without_ipa_and_other_languages_are_absent():
    ipa = build_ipa(JSONL, LEMMAS, lang_code="la")
    assert "600" not in ipa
    assert all("/ˈrɔ.za/" != v["ipa"] for vs in ipa.values() for v in vs)


def test_coverage():
    assert ipa_coverage(build_ipa(JSONL, LEMMAS, lang_code="la"), LEMMAS) == 2 / 3


def test_inflected_form_entries_do_not_lend_their_ipa_to_the_lemma():
    ipa = build_ipa(JSONL, LEMMAS, lang_code="la")
    assert all(v["ipa"] != "[ˈrɔ.saː]" for v in ipa["33803"])
