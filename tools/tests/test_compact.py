import json

from casus_build.shard import (decode_analysis, encode_analysis, shard_key, split_shards,
                               write_assets)

NOUN = {"lemma": "33803", "pos": "noun", "case": "nom", "number": "sg", "gender": "f"}
ADJ = {"lemma": "7", "pos": "adj", "case": "acc", "number": "pl", "gender": "x", "degree": "super"}
VERB = {"lemma": "9", "pos": "verb", "person": "3", "number": "pl", "tense": "plup",
        "mood": "sub", "voice": "pass", "conj": "3-io"}
VPAR = {"lemma": "9", "pos": "vpar", "case": "abl", "number": "sg", "gender": "n",
        "tense": "perf", "voice": "pass", "conj": "4"}
PREP = {"lemma": "1", "pos": "prep", "governs": "abl"}
ADV = {"lemma": "2", "pos": "adv", "degree": "comp"}
CONJ = {"lemma": "3", "pos": "conj"}
PRON = {"lemma": "4", "pos": "pron", "case": "dat", "number": "pl", "gender": "c"}
SUPINE = {"lemma": "5", "pos": "supine", "case": "acc", "number": "sg", "gender": "n"}
ALL = [NOUN, ADJ, VERB, VPAR, PREP, ADV, CONJ, PRON, SUPINE]


def test_codes_are_short_and_round_trip():
    for a in ALL:
        code = encode_analysis(a)
        assert 1 <= len(code) <= 7, (a, code)
        assert decode_analysis(code, a["lemma"]) == a


def test_unknown_gender_or_case_encodes_as_x():
    assert encode_analysis({**NOUN, "gender": None}) == encode_analysis({**NOUN, "gender": "x"})
    assert decode_analysis(encode_analysis({**PREP, "governs": None}), "1")["governs"] == "x"


def test_distinct_analyses_get_distinct_codes():
    codes = {encode_analysis(a) for a in ALL}
    assert len(codes) == len(ALL)
    assert encode_analysis(NOUN) != encode_analysis({**NOUN, "case": "voc"})


def test_split_shards_keeps_small_prefixes_whole_and_splits_big_ones():
    forms = [f"co{c}{d}" for c in "abcdefghij" for d in "xyz"] + ["co", "rosa", "rosam", "a"]
    names = split_shards(forms, max_forms=5)
    assert "ro" in names and "a" in names
    assert "co" in names and "coa" in names          # the parent keeps forms of its own length
    assert all(n not in names for n in ("cox", "coay"))


def test_shard_key_is_the_longest_prefix_among_the_shard_names():
    names = {"a", "ro", "co", "coa", "con", "cons"}
    assert shard_key("rosam", names) == "ro"
    assert shard_key("coactus", names) == "coa"
    assert shard_key("consul", names) == "cons"
    assert shard_key("cor", names) == "co"
    assert shard_key("a", names) == "a"
    assert shard_key("zebra", names) is None
    assert shard_key("rosam") == "ro"               # the plain two-letter rule still stands


def test_write_assets_compact_rows_grouped_by_lemma(tmp_path):
    index = {"rosa": [NOUN, {**NOUN, "case": "abl"}, {**VPAR, "lemma": "33776"}]}
    manifest = write_assets(index, {}, tmp_path)
    shard = json.loads((tmp_path / "forms" / "ro.json").read_text())
    assert shard == {"rosa": [[33803, encode_analysis(NOUN), encode_analysis({**NOUN, "case": "abl"})],
                              [33776, encode_analysis(VPAR)]]}
    assert manifest["format"] == 2
    assert manifest["shards"]["ro"]["forms"] == 1


def test_write_assets_splits_a_big_prefix(tmp_path):
    index = {f"co{c}{d}": [NOUN] for c in "abcdefghij" for d in "xyz"}
    manifest = write_assets(index, {}, tmp_path, max_forms=5)
    assert "coa" in manifest["shards"] and "co" not in manifest["shards"]
    assert sum(s["forms"] for s in manifest["shards"].values()) == 30


def test_decode_handles_a_verb_without_conjugation():
    code = encode_analysis({**VERB, "conj": None})
    assert code.endswith("x")
    assert decode_analysis(code, "9")["conj"] is None
