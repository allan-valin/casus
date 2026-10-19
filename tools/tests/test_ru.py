import json
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from casus_build.ru.normalize import strip_ru  # noqa: E402
from casus_build.ru.parse import parse_entries, build_index  # noqa: E402
from casus_build.ru.codes import encode_analysis, decode_analysis  # noqa: E402


def entry(word, pos, forms, gloss="x"):
    return json.dumps({"word": word, "pos": pos, "forms": forms, "senses": [{"glosses": [gloss]}]}, ensure_ascii=False)


def test_strip():
    assert strip_ru("Москва́") == "москва" and strip_ru("ёлка") == "елка" and strip_ru("й") == "й"


def test_noun_and_verb():
    lines = [entry("книга", "noun", [{"form": "кни́га", "tags": ["canonical", "feminine", "inanimate"]}, {"form": "kníga", "tags": ["romanization"]},
                                      {"form": "кни́ги", "tags": ["genitive", "singular"]}, {"form": "кни́ги", "tags": ["nominative", "plural"]},
                                      {"form": "кни́гой", "tags": ["instrumental", "singular"]}], "book"),
             entry("читать", "verb", [{"form": "чита́ть", "tags": ["canonical", "imperfective"]}, {"form": "прочита́ть", "tags": ["perfective"]},
                                       {"form": "чита́ю", "tags": ["first-person", "present", "singular"]}, {"form": "чита́ла", "tags": ["feminine", "past", "singular"]},
                                       {"form": "бу́ду чита́ть", "tags": ["first-person", "future", "singular"]}, {"form": "чита́вший", "tags": ["active", "participle", "past"]}], "to read")]
    book, read = list(parse_entries(lines))
    assert book["gender"] == "f" and read["aspect"] == "impf" and read["partner"] == "прочита́ть"
    index = build_index([book, read])
    assert {"lemma": book["id"], "pos": "noun", "case": "gen", "number": "sg", "gender": "f"} in index["кни́ги"]
    assert {"lemma": book["id"], "pos": "noun", "case": "nom", "number": "pl"} in index["кни́ги"]
    assert {"lemma": read["id"], "pos": "verb", "person": "1", "number": "sg", "tense": "pres", "mood": "ind", "aspect": "impf"} in index["чита́ю"]
    assert {"lemma": read["id"], "pos": "verb", "number": "sg", "gender": "f", "tense": "past", "mood": "ind", "aspect": "impf"} in index["чита́ла"]
    assert "чита́вший" not in index and "бу́ду чита́ть" not in index


def test_codes():
    for a in ({"pos": "noun", "case": "ins", "number": "pl"}, {"pos": "verb", "person": "3", "number": "sg", "tense": "fut", "mood": "ind", "aspect": "pf"}):
        assert decode_analysis(encode_analysis(a), "1") == {"lemma": "1", **a}


def test_form_of_entries_old_spellings_and_cross_listed_pronouns_stay_out():
    from casus_build.ru.parse import tidy
    lines = [json.dumps({"word": "читаю", "pos": "verb", "forms": [{"form": "чита́ю", "tags": ["canonical"]}],
                         "senses": [{"glosses": ["first-person singular present of чита́ть"], "tags": ["form-of"]}]}, ensure_ascii=False),
             entry("я", "pron", [{"form": "я", "tags": ["canonical"]}, {"form": "меня́", "tags": ["genitive"]}, {"form": "мне", "tags": ["dative"]},
                                  {"form": "она́", "tags": ["nominative"]}, {"form": "мнѣ", "tags": ["dative"]}], "I"),
             entry("она", "pron", [{"form": "она́", "tags": ["canonical"]}, {"form": "её", "tags": ["genitive"]}], "she")]
    entries = tidy(list(parse_entries(lines)))
    assert [e["headword"] for e in entries] == ["я", "она́"]
    ja = entries[0]
    forms = {t for t, _a in ja["cells"]}
    assert "меня́" in forms and "мне" in forms and "она́" not in forms and "мнѣ" not in forms
