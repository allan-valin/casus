"""Drills (Allan, 2026-10-18): model words per language with their full tables, in data/<code>/drills.json."""
import json
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from build_drills import pick_models  # noqa: E402

LEMMAS = {
    "1": {"headword": "rosa", "dict_form": "rosa, -ae f.", "pos": "noun", "freq": "B"},
    "2": {"headword": "sum", "dict_form": "sum", "pos": "adj", "freq": "D"},
    "3": {"headword": "sum", "dict_form": "sum, -esse", "pos": "verb", "freq": "A"},
    "4": {"headword": "rosa", "dict_form": "rosa, -ae f.", "pos": "noun", "freq": "E"},
}
PARADIGMS = {"1": [["rosa", "nnsf"]], "3": [["est", "v3spia5"]], "4": [["rosae", "ngsf"]]}


def test_picks_by_headword_and_pos_most_frequent_first_and_skips_missing():
    models = [("rosa", "noun", "rose", "rosa"), ("sum", "verb", "to be", "ser"), ("nemo", "noun", "nobody", "ninguém")]
    out = pick_models(models, LEMMAS, lambda i: PARADIGMS.get(i))
    assert [m["id"] for m in out] == ["1", "3"]
    assert out[0] == {"id": "1", "headword": "rosa", "dict_form": "rosa, -ae f.", "pos": "noun", "gloss": {"en": "rose", "pt": "rosa"}, "rows": [["rosa", "nnsf"]]}


def test_the_built_files_exist_for_every_language_with_paradigms():
    root = Path(__file__).resolve().parents[2] / "data"
    for code in ("la", "grc", "de"):
        p = root / code / "drills.json"
        if not (root / code / "paradigms").exists():
            continue
        data = json.loads(p.read_text())
        assert {m["pos"] for m in data} >= {"noun", "verb"}, code



def test_signature_is_the_endings_after_the_shared_stem():
    from build_drills import signature
    rosa = [["rosa", "nnsf", "nbsf"], [4, "e", "ngsf"], [4, "m", "nasf"]]
    terra = [["terra", "nnsf", "nbsf"], [5, "e", "ngsf"], [5, "m", "nasf"]]
    rex = [["rex", "nnsm"], [2, "gis", "ngsm"]]
    assert signature(terra) == signature(rosa)
    assert signature(rex) != signature(rosa)
    # Greek accents move with the ending; they do not change the table
    assert signature([["λόγος", "nnsm"], [3, "ου", "ngsm"]]) == signature([["ἄνθρωπος", "nnsm"], ["ἀνθρώπου", "ngsm"]])


def test_pool_follows_the_same_table_most_frequent_first_and_irregulars_get_none():
    from build_drills import pools
    lemmas = {"1": {"headword": "rosa", "pos": "noun", "dict_form": "rosa, -ae f.", "freq": "B"},
              "2": {"headword": "terra", "pos": "noun", "dict_form": "terra, -ae f.", "freq": "A"},
              "3": {"headword": "rex", "pos": "noun", "dict_form": "rex, regis m.", "freq": "A"},
              "4": {"headword": "aqua", "pos": "noun", "dict_form": "aqua, -ae f.", "freq": "C"},
              "5": {"headword": "sum", "pos": "verb", "dict_form": "sum, esse", "freq": "A"}}
    rows = {"1": [["rosa", "nnsf"], [4, "e", "ngsf"]], "2": [["terra", "nnsf"], [5, "e", "ngsf"]], "3": [["rex", "nnsm"], [2, "gis", "ngsm"]],
            "4": [["aqua", "nnsf"], [4, "e", "ngsf"]], "5": [["sum", "v1spia5"]]}
    models = [{"id": "1", "headword": "rosa", "pos": "noun"}, {"id": "5", "headword": "sum", "pos": "verb"}]
    out = pools(models, lemmas, rows.get, {"2": "earth", "4": "water"}, irregular={"sum"})
    assert out["1"] == [["2", "terra, -ae f.", "earth"], ["4", "aqua, -ae f.", "water"]]
    assert out["5"] == []


def test_matching_tolerates_extra_dictionary_forms_umlauts_and_augments():
    from build_drills import core_endings, same_table
    frau = core_endings([["Frau", "nnsf", "ngsf", "ndsf", "nasf"], ["Frauen", "nnpf", "ngpf", "ndpf", "napf", "ngsf"]], "Frau")
    zeitung = core_endings([["Zeitung", "nnsf", "ngsf", "ndsf", "nasf"], ["Zeitungen", "nnpf", "ngpf", "ndpf", "napf"]], "Zeitung")
    assert same_table(frau, zeitung)
    mann = core_endings([["Mann", "nnsm", "nasm"], ["Mannes", "ngsm"], ["Männer", "nnpm", "napm", "ngpm"], ["Männern", "ndpm"]], "Mann")
    wald = core_endings([["Wald", "nnsm", "nasm"], ["Waldes", "ngsm"], ["Wälder", "nnpm", "napm", "ngpm"], ["Wäldern", "ndpm"]], "Wald")
    hund = core_endings([["Hund", "nnsm", "nasm"], ["Hundes", "ngsm"], ["Hunde", "nnpm", "napm", "ngpm"], ["Hunden", "ndpm"]], "Hund")
    assert same_table(mann, wald) and not same_table(mann, hund)
    # augmented past forms do not carry the stem: they are left out, the present system decides
    luo = core_endings([["λύω", "v1spia"], ["λύεις", "v2spia"], ["ἔλυον", "v1siia"], ["λύσω", "v1sfia"]], "λύω")
    pauo = core_endings([["παύω", "v1spia"], ["παύεις", "v2spia"], ["ἔπαυον", "v1siia"], ["παύσω", "v1sfia"]], "παύω")
    assert same_table(luo, pauo)


def test_nouns_match_every_cell_and_names_abbreviations_and_cross_references_stay_out():
    from build_drills import pools
    L = lambda h, d, pos="noun": {"headword": h, "pos": pos, "dict_form": d}
    lemmas = {"1": L("puer", "puer, -i m."), "2": L("animus", "animus, -i m."), "3": L("gener", "gener, -i m."),
              "4": L("Caesar", "Caesar, -i m."), "5": L("CD", "CD, -i m."), "6": L("socer", "socer, -i m.")}
    rows = {i: [[h, "nnsm"], [len(h), "i", "ngsm"], [len(h), "o", "ndsm"]] for i, h in [("1", "puer"), ("3", "gener"), ("4", "Caesar"), ("5", "CD"), ("6", "socer")]}
    rows["2"] = [["animus", "nnsm"], [5, "i", "ngsm"], [5, "o", "ndsm"]]
    glosses = {"2": "mind", "3": "son-in-law", "4": "Caesar", "5": "compact disc", "6": "alternative form of socerus"}
    out = pools([{"id": "1", "headword": "puer", "pos": "noun"}], lemmas, rows.get, glosses)
    assert [p[0] for p in out["1"]] == ["3"]


def test_a_models_rare_variant_forms_do_not_widen_its_table():
    from build_drills import core_endings, same_table
    rows = [["Mann", "nnsm", "nnpm", "nasm"], ["Mannen", "nnpm"], ["Mannes", "ngsm"], ["Männer", "nnpm"]]
    used = {"männer": 900, "mannes": 50, "mann": 5000}
    mann = core_endings(rows, "Mann", used)
    assert mann["nnpm"] == {(0, "er")}
    typ = core_endings([["Typ", "nnsm", "nasm"], ["Typen", "nnpm"], ["Typs", "ngsm"]], "Typ")
    assert not same_table(mann, typ, 1.0)


def test_weak_nouns_match_whatever_their_variant_plurals():
    from build_drills import core_endings, same_table
    junge = core_endings([["Junge", "nnsm"], ["Jungen", "nnpm", "ngsm", "ndsm", "nasm"], ["Jungs", "nnpm"]], "Junge")
    kollege = core_endings([["Kollege", "nnsm"], ["Kollegen", "nnpm", "ngsm", "ndsm", "nasm"]], "Kollege")
    assert same_table(junge, kollege, 1.0)


def test_latin_names_stay_out_and_core_words_come_first():
    from build_drills import pools
    L = lambda h, d, f="C": {"headword": h, "pos": "noun", "dict_form": d, "freq": f}
    lemmas = {"1": L("rex", "rex, regis m."), "2": L("ambiorix", "ambiorix, -igis m."), "3": L("grex", "grex, gregis m."), "4": L("lex", "lex, legis f.")}
    rows = {i: [[h, "nnsm"], [len(h) - 1, "gis", "ngsm"]] for i, h in [("1", "rex"), ("2", "ambiorix"), ("3", "grex"), ("4", "lex")]}
    rows["4"] = [["lex", "nnsm"], [2, "gis", "ngsm"]]
    glosses = {"2": "Ambiorix, a chief of the Eburones", "3": "flock, herd", "4": "law"}
    out = pools([{"id": "1", "headword": "rex", "pos": "noun"}], lemmas, rows.get, glosses, rank={"lex": 50})
    assert [p[1] for p in out["1"]] == ["lex, legis f.", "grex, gregis m."]


def test_japanese_godan_verbs_match_only_the_same_ending():
    from build_drills import core_endings, same_table
    kaku = core_endings([["書く", "vd"], ["書かない", "vn"], ["書きます", "vm"], ["書いて", "vt"]], "書く", lead_drop=1)
    kiku = core_endings([["聞く", "vd"], ["聞かない", "vn"], ["聞きます", "vm"], ["聞いて", "vt"]], "聞く", lead_drop=1)
    au = core_endings([["会う", "vd"], ["会わない", "vn"], ["会います", "vm"], ["会って", "vt"]], "会う", lead_drop=1)
    assert same_table(kaku, kiku, 1.0) and not same_table(kaku, au, 1.0)


def test_dakuten_are_not_accents():
    from build_drills import _plain
    assert _plain("泳ぐ") == "泳ぐ" and _plain("パン") == "パン" and _plain("λόγος") == "λογοσ"
