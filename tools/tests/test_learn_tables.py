import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from learn_tables import paradigm_table  # noqa: E402

DATA = Path(__file__).parent / "fixtures" / "tables" / "xx"


def test_a_noun_table_from_the_paradigms():
    t = paradigm_table(DATA, {"word": "γένος", "pos": "noun"}, attested={"γένους": 3}, final_sigma=True)
    assert t["head"]["pt"] == ["", "singular", "plural"]
    rows = {r[0]["en"]: r[1:] for r in t["rows"]}
    assert rows["nominative"] == ["γένος", "γένη"]          # final ς; γένη (shortest) before γένεα
    assert rows["genitive"] == ["γένους", "γενῶν"]          # the attested Attic form, not γένεος
    assert "vocative" not in rows                           # no form: no row


def test_a_verb_table():
    t = paradigm_table(DATA, {"word": "λύω", "pos": "verb", "tense": "pres", "mood": "ind", "voice": "act"}, final_sigma=True)
    rows = {r[0]["en"]: r[1:] for r in t["rows"]}
    assert rows["1st person"] == ["λύω", "λύομεν"] and rows["2nd person"] == ["λύεις", "λύετε"] and rows["3rd person"] == ["λύει", "λύουσι"]


def test_past_indicatives_prefer_the_augmented_form(tmp_path):
    import json, shutil
    d = tmp_path / "xx"
    shutil.copytree(DATA, d)
    para = json.loads((d / "paradigms" / "8.json").read_text(encoding="utf-8"))
    para["8"] += [["λῦσα", "v1saia"], ["ἔλυσα", "v1saia"], ["λύσαμεν", "v1paia"], ["ἐλύσαμεν", "v1paia"]]
    (d / "paradigms" / "8.json").write_text(json.dumps(para, ensure_ascii=False), encoding="utf-8")
    codes = json.loads((d / "codes.json").read_text(encoding="utf-8"))
    codes["TABLES"]["tense"]["a"] = "aor"
    (d / "codes.json").write_text(json.dumps(codes, ensure_ascii=False), encoding="utf-8")
    t = paradigm_table(d, {"word": "λύω", "pos": "verb", "tense": "aor", "mood": "ind", "voice": "act"}, final_sigma=True)
    assert t["rows"][0][1:] == ["ἔλυσα", "ἐλύσαμεν"]


def test_finnish_cases_and_an_adjective_without_gender():
    fi = Path(__file__).parent / "fixtures" / "tables" / "fi"
    t = paradigm_table(fi, {"word": "talo", "pos": "noun"})
    rows = {r[0]["en"]: r[1:] for r in t["rows"]}
    assert rows["partitive"] == ["taloa", "taloja"] and rows["inessive"] == ["talossa", "taloissa"]
    assert rows["illative"] == ["taloon", "taloihin"] and rows["translative"] == ["taloksi", "taloiksi"]
    assert list(rows)[:4] == ["nominative", "genitive", "partitive", "accusative"] or list(rows)[:3] == ["nominative", "genitive", "partitive"]
    a = paradigm_table(fi, {"word": "iso", "pos": "adj"})
    assert a["head"]["en"] == ["", "singular", "plural"]
    assert {r[0]["en"]: r[1:] for r in a["rows"]}["elative"] == ["isosta", "isoista"]
