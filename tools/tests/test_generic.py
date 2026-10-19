import json
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from casus_build.generic import FINNISH, parse_entries, build_index, codes  # noqa: E402


def test_finnish_noun_and_codes():
    line = json.dumps({"word": "talo", "pos": "noun", "forms": [{"form": "talossa", "tags": ["inessive", "singular"]},
        {"form": "taloihin", "tags": ["illative", "plural"]}, {"form": "talo", "tags": ["canonical"]}], "senses": [{"glosses": ["house"]}]})
    e = list(parse_entries(FINNISH, [line]))[0]
    index = build_index([e])
    assert {"lemma": e["id"], "pos": "noun", "case": "ine", "number": "sg"} in index["talossa"]
    encode, decode, _j = codes(FINNISH)
    a = {"pos": "noun", "case": "ill", "number": "pl"}
    assert decode(encode(a), "1") == {"lemma": "1", **a}


def test_a_form_that_is_not_a_word_never_becomes_a_key():
    line = json.dumps({"word": "talo", "pos": "noun", "forms": [{"form": "/ˈtɑlo/", "tags": ["nominative", "singular"]},
        {"form": "talo", "tags": ["nominative", "singular"]}], "senses": [{"glosses": ["house"]}]})
    index = build_index(list(parse_entries(FINNISH, [line])))
    assert list(index) == ["talo"]


def test_a_headword_that_is_not_a_word_never_becomes_a_key():
    line = json.dumps({"word": "7/24", "pos": "adv", "forms": [], "senses": [{"glosses": ["all the time"]}]})
    assert build_index(list(parse_entries(FINNISH, [line]))) == {}


def test_a_table_without_person_tags_gets_the_person_from_its_order():
    from casus_build.generic import CONFIGS
    line = json.dumps({"word": "czytać", "pos": "verb", "forms": [
        {"form": "czytam", "tags": ["present", "singular"]}, {"form": "czytamy", "tags": ["plural", "present"]},
        {"form": "czytasz", "tags": ["present", "singular"]}, {"form": "czytacie", "tags": ["plural", "present"]},
        {"form": "czyta", "tags": ["present", "singular", "third-person"]}, {"form": "czytają", "tags": ["plural", "present", "third-person"]}],
        "senses": [{"glosses": ["to read"]}]}, ensure_ascii=False)
    index = build_index(list(parse_entries(CONFIGS["pl"], [line])))
    assert index["czytam"][0]["person"] == "1" and index["czytasz"][0]["person"] == "2" and index["czytacie"][0]["person"] == "2"
    assert index["czyta"][0]["person"] == "3"


def test_turkish_person_from_the_personal_ending():
    from casus_build.generic import turkish_person
    assert turkish_person("okuyorum") == ("1", "sg") and turkish_person("okuyorsun") == ("2", "sg") and turkish_person("okuyor") == ("3", "sg")
    assert turkish_person("okuyoruz") == ("1", "pl") and turkish_person("okuyorsunuz") == ("2", "pl") and turkish_person("okuyorlar") == ("3", "pl")
    assert turkish_person("okudum") == ("1", "sg") and turkish_person("okuduk") == ("1", "pl") and turkish_person("geliyorsunuz") == ("2", "pl")


def test_a_caseless_language_keeps_number_and_gender_without_a_case():
    from casus_build.generic import CONFIGS
    line = json.dumps({"word": "livro", "pos": "noun", "forms": [{"form": "livros", "tags": ["plural"]}], "senses": [{"glosses": ["book"]}]})
    index = build_index(list(parse_entries(CONFIGS["pt"], [line])))
    assert index["livros"][0]["pos"] == "noun" and index["livros"][0]["number"] == "pl" and not index["livros"][0].get("case")


def test_a_caseless_noun_keeps_its_headword_as_the_singular():
    from casus_build.generic import CONFIGS
    line = json.dumps({"word": "menino", "pos": "noun", "head_templates": [{"args": {"1": "m"}}], "forms": [{"form": "meninos", "tags": ["plural"]}, {"form": "menina", "tags": ["feminine"]}], "senses": [{"glosses": ["boy"]}]})
    index = build_index(list(parse_entries(CONFIGS["pt"], [line])))
    assert index["menino"][0]["pos"] == "noun" and index["menino"][0]["number"] == "sg"


def test_a_caseless_determiner_keeps_its_headword():
    from casus_build.generic import CONFIGS
    line = json.dumps({"word": "um", "pos": "article", "forms": [{"form": "uma", "tags": ["feminine"]}, {"form": "uns", "tags": ["plural"]}], "senses": [{"glosses": ["a, an"]}]})
    index = build_index(list(parse_entries(CONFIGS["pt"], [line])))
    assert index["um"][0]["pos"] == "det"


def test_a_pronoun_form_that_is_some_pronouns_headword_belongs_to_that_pronoun_only():
    from casus_build.generic import CONFIGS
    table = [{"form": "ég", "tags": ["nominative", "singular"]}, {"form": "hún", "tags": ["nominative", "singular", "feminine"]}]
    lines = [json.dumps({"word": w, "pos": "pron", "forms": table, "senses": [{"glosses": [g]}]}, ensure_ascii=False) for w, g in (("ég", "I"), ("hún", "she"))]
    index = build_index(list(parse_entries(CONFIGS["is"], lines)))
    assert len({a["lemma"] for a in index["hún"]}) == 1 and len({a["lemma"] for a in index["ég"]}) == 1


def test_hungarian_person_from_the_ending():
    from casus_build.generic import hungarian_person
    h = "olvas"
    assert [hungarian_person(f, h, definite=False, past=False) for f in ["olvasok", "olvasol", "olvas", "olvasunk", "olvastok", "olvasnak"]] == \
        [("1", "sg"), ("2", "sg"), ("3", "sg"), ("1", "pl"), ("2", "pl"), ("3", "pl")]
    assert [hungarian_person(f, h, definite=True, past=False) for f in ["olvasom", "olvasod", "olvassa", "olvassuk", "olvassátok", "olvassák"]] == \
        [("1", "sg"), ("2", "sg"), ("3", "sg"), ("1", "pl"), ("2", "pl"), ("3", "pl")]
    assert [hungarian_person(f, h, definite=False, past=True) for f in ["olvastam", "olvastál", "olvasott", "olvastunk", "olvastatok", "olvastak"]] == \
        [("1", "sg"), ("2", "sg"), ("3", "sg"), ("1", "pl"), ("2", "pl"), ("3", "pl")]
    assert hungarian_person("lakom", "lakik", definite=False, past=False) == ("1", "sg")
    assert hungarian_person("gondol", "gondol", definite=False, past=False) == ("3", "sg")
    assert hungarian_person("néztek", "néz", definite=False, past=False) == ("2", "pl")


def test_hungarian_tables_are_read_despite_their_tags():
    from casus_build.generic import CONFIGS
    forms = [{"form": "olvasok", "tags": ["error-unrecognized-form", "indefinite", "informal", "second-person", "singular"]},
             {"form": "olvassák", "tags": ["definite", "error-unrecognized-form"]},
             {"form": "olvastam", "tags": ["error-unrecognized-form", "indefinite", "informal", "past", "second-person", "singular"]}]
    line = json.dumps({"word": "olvas", "pos": "verb", "forms": forms, "senses": [{"glosses": ["to read"]}]}, ensure_ascii=False)
    index = build_index(list(parse_entries(CONFIGS["hu"], [line])))
    assert (index["olvasok"][0]["person"], index["olvasok"][0]["number"], index["olvasok"][0]["tense"]) == ("1", "sg", "pres")
    assert (index["olvassák"][0]["person"], index["olvassák"][0]["number"]) == ("3", "pl")
    assert index["olvastam"][0]["tense"] == "past"


def test_an_unrecognised_pronoun_table_still_gives_its_forms_with_the_case_unknown():
    from casus_build.generic import CONFIGS
    forms = [{"form": "moja", "tags": ["error-unrecognized-form", "feminine", "singular"]}, {"form": "moi", "tags": ["error-unrecognized-form", "plural", "virile"]}]
    line = json.dumps({"word": "mój", "pos": "pron", "forms": forms, "senses": [{"glosses": ["my"]}]}, ensure_ascii=False)
    index = build_index(list(parse_entries(CONFIGS["pl"], [line])))
    assert index["moja"][0]["pos"] == "pron" and index["moja"][0].get("case") is None and index["moja"][0]["gender"] == "f"


def test_turkish_possessed_forms_keep_their_case_and_the_nouns_own_number():
    from casus_build.generic import CONFIGS
    forms = [{"form": "evine", "tags": ["dative", "possessed-single", "possessive", "singular", "third-person"]},
             {"form": "evinize", "tags": ["dative", "plural", "possessed-single", "possessive", "second-person"]},
             {"form": "evlerine", "tags": ["dative", "possessed-many", "possessive", "singular", "third-person"]}]
    line = json.dumps({"word": "ev", "pos": "noun", "forms": forms, "senses": [{"glosses": ["house"]}]})
    index = build_index(list(parse_entries(CONFIGS["tr"], [line])))
    assert (index["evine"][0]["case"], index["evine"][0]["number"]) == ("dat", "sg")
    assert index["evinize"][0]["number"] == "sg" and index["evlerine"][0]["number"] == "pl"


def test_czech_gaps_found_in_real_texts():
    from casus_build.generic import CONFIGS
    cs = CONFIGS["cs"]
    lines = [json.dumps(x, ensure_ascii=False) for x in [
        {"word": "ve", "pos": "prep", "forms": [], "senses": [{"glosses": ["alternative form of v (“in”)"], "tags": ["alt-of", "alternative"]}]},
        {"word": "dva", "pos": "num", "forms": [{"form": "dvě", "tags": ["error-unrecognized-form", "nominative", "plural"]}], "senses": [{"glosses": ["two"]}]},
        {"word": "být", "pos": "verb", "forms": [{"form": "byl", "tags": ["animate", "masculine", "participle", "past", "singular"]},
                                                 {"form": "byla", "tags": ["feminine", "participle", "past", "singular"]}], "senses": [{"glosses": ["to be"]}]}]]
    index = build_index(list(parse_entries(cs, lines)))
    assert index["ve"][0]["pos"] == "prep"
    assert index["dvě"][0]["case"] == "nom"
    assert (index["byl"][0]["pos"], index["byl"][0]["tense"], index["byl"][0]["gender"], index["byl"][0]["number"]) == ("verb", "past", "m", "sg")
    assert index["byla"][0]["gender"] == "f"


def test_verb_codes_keep_gender_voice_and_negation():
    from casus_build.generic import CONFIGS, codes
    encode, decode, _ = codes(CONFIGS["tr"])
    a = {"pos": "verb", "person": "3", "number": "sg", "tense": "pres", "mood": "ind", "gender": "f", "voice": "pass", "polarity": "neg"}
    assert {k: v for k, v in decode(encode(a), "1").items() if k != "lemma"} == a


def test_negative_and_mediopassive_verb_forms_are_kept():
    from casus_build.generic import CONFIGS
    lines = [json.dumps({"word": "kalmak", "pos": "verb", "forms": [{"form": "kalmaz", "tags": ["aorist", "negative", "singular", "third-person"]}], "senses": [{"glosses": ["to stay"]}]}),
             json.dumps({"word": "φοβάμαι", "pos": "verb", "forms": [{"form": "φοβάσαι", "tags": ["mediopassive", "present", "second-person", "singular"]}], "senses": [{"glosses": ["to fear"]}]}, ensure_ascii=False)]
    tr = build_index(list(parse_entries(CONFIGS["tr"], lines[:1])))
    assert tr["kalmaz"][0]["polarity"] == "neg"
    el = build_index(list(parse_entries(CONFIGS["el"], lines[1:])))
    assert (el["φοβάσαι"][0]["person"], el["φοβάσαι"][0]["voice"]) == ("2", "pass")


def test_names_form_of_pronouns_and_participles():
    from casus_build.generic import CONFIGS
    lines = [json.dumps(x, ensure_ascii=False) for x in [
        {"word": "Praha", "pos": "name", "forms": [{"form": "Praze", "tags": ["locative", "singular"]}], "senses": [{"glosses": ["Prague"], "tags": ["feminine"]}]},
        {"word": "σου", "pos": "pron", "forms": [], "senses": [{"glosses": ["genitive singular of εσύ"], "tags": ["form-of", "genitive", "singular"]}]},
        {"word": "yüzmek", "pos": "verb", "forms": [{"form": "yüzen", "tags": ["participle", "present"]}], "senses": [{"glosses": ["to swim"]}]}]]
    cs = build_index(list(parse_entries(CONFIGS["cs"], lines[:1])))
    assert cs["praze"][0]["case"] == "loc"
    el = build_index(list(parse_entries(CONFIGS["el"], lines[1:2])))
    assert (el["σου"][0]["pos"], el["σου"][0]["case"]) == ("pron", "gen")
    tr = build_index(list(parse_entries(CONFIGS["tr"], lines[2:])))
    assert (tr["yüzen"][0]["pos"], tr["yüzen"][0]["mood"]) == ("verb", "part")
