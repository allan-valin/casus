"""Data for the newer drills (research 2026-10-20 items 8, 12, 14): frequent words with their IPA and the minimal
pairs among them; frequent nouns with their gender to sort into bins."""
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from build_drill_extras import segments, minimal_pair, sounds, bins  # noqa: E402

LEMMAS = {"1": {"headword": "Hölle", "pos": "noun", "gender": "f"}, "2": {"headword": "Hülle", "pos": "noun", "gender": "f"},
          "3": {"headword": "Haus", "pos": "noun", "gender": "n"}, "4": {"headword": "Mann", "pos": "noun", "gender": "m"},
          "5": {"headword": "gehen", "pos": "verb"}, "6": {"headword": "Maus", "pos": "noun", "gender": "f"},
          "7": {"headword": "Staat", "pos": "noun", "gender": "m"}, "8": {"headword": "Stadt", "pos": "noun", "gender": "f"}}
IPA = {"1": [{"ipa": "/ˈhœlə/"}], "2": [{"ipa": "/ˈhʏlə/"}], "3": [{"ipa": "/haʊ̯s/"}], "4": [{"ipa": "/man/"}],
       "5": [{"ipa": "/ˈɡeːən/"}], "6": [{"ipa": "/maʊ̯s/"}], "7": [{"ipa": "/ʃtaːt/"}], "8": [{"ipa": "/ʃtat/"}]}
FREQ = [{"w": w, "en": e, "rank": k} for k, (w, e) in enumerate([("Haus", "house"), ("Mann", "man"), ("gehen", "to go"), ("Maus", "mouse"),
                                                                    ("Hölle", "hell"), ("Hülle", "cover"), ("Staat", "state"), ("Stadt", "city")], 1)]


def test_segments_keep_length_and_diacritics_on_their_sound():
    assert segments("/ˈʃtaːt/") == ["ʃ", "t", "aː", "t"]
    assert segments("/haʊ̯s/") == ["h", "a", "ʊ̯", "s"]


def test_a_minimal_pair_differs_in_one_sound_only():
    assert minimal_pair(segments("/ˈhœlə/"), segments("/ˈhʏlə/"))
    assert minimal_pair(segments("/ʃtaːt/"), segments("/ʃtat/"))      # length counts
    assert not minimal_pair(segments("/haʊ̯s/"), segments("/man/"))
    assert not minimal_pair(segments("/man/"), segments("/man/"))


def test_sounds_lists_frequent_words_with_ipa_and_their_pairs():
    out = sounds(FREQ, LEMMAS, IPA)
    words = [w["w"] for w in out["words"]]
    assert words[:3] == ["Haus", "Mann", "gehen"] and out["words"][0]["ipa"] == "/haʊ̯s/" and out["words"][0]["en"] == "house"
    pairs = {tuple(sorted((words[a], words[b]))) for a, b in out["pairs"]}
    assert ("Haus", "Maus") in pairs and ("Hölle", "Hülle") in pairs and ("Staat", "Stadt") in pairs


def test_bins_sort_frequent_nouns_by_gender():
    out = bins(FREQ, LEMMAS)
    assert out["kind"] == "gender" and out["bins"] == ["m", "f", "n"]
    assert {"w": "Haus", "en": "house", "bin": "n"} in out["items"] and not any(i["w"] == "gehen" for i in out["items"])


def test_a_noun_listed_with_two_genders_is_left_out():
    lem = {**LEMMAS, "9": {"headword": "Haus", "pos": "noun", "gender": "m"}}
    assert not any(i["w"] == "Haus" for i in bins(FREQ, lem)["items"])


def test_the_frequency_list_writes_dictionary_forms_and_the_bin_shows_the_bare_word():
    lem = {"1": {"headword": "Mann", "dict_form": "der Mann", "pos": "noun", "gender": "m"},
           "2": {"headword": "te", "dict_form": "te (f.)", "pos": "noun", "gender": "f"}}
    out = bins([{"w": "der Mann", "en": "man", "pos": "noun"}, {"w": "te (f.)", "en": "The name of the letter T", "pos": "noun"}], lem)
    assert out["items"] == [{"w": "Mann", "en": "man", "bin": "m"}]


def test_a_gender_almost_no_noun_has_is_left_out():
    lem = {str(k): {"headword": f"w{k}", "pos": "noun", "gender": "f" if k else "n"} for k in range(40)}
    out = bins([{"w": f"w{k}", "en": "x", "pos": "noun"} for k in range(40)], lem)
    assert out["bins"] == ["f"] and len(out["items"]) == 39


def test_latin_core_list_entries_find_their_headword():
    lem = {"1": {"headword": "rosa", "dict_form": "rosa, -ae f.", "pos": "noun", "gender": "f"}}
    assert bins([{"w": "rosa rosae f.", "en": "rose", "pos": "Noun: 1st declension"}], lem)["items"][0]["w"] == "rosa"
