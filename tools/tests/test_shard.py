import json

from casus_build.shard import decode_analysis, shard_key, write_assets


def test_shard_key_uses_first_two_letters():
    assert shard_key("rosam") == "ro"
    assert shard_key("a") == "a"


def test_write_assets_emits_manifest_and_shards(tmp_path):
    index = {"rosam": [{"lemma": "ros:noun:1", "pos": "noun", "case": "acc",
                        "number": "sg", "gender": "f"}]}
    lemmas = {"ros:noun:1": {"dict_form": "rosa, -ae", "pos": "noun", "decl": 1,
                             "gender": "f", "age": "X", "freq": "A"}}
    manifest = write_assets(index, lemmas, tmp_path)
    assert (tmp_path / "forms" / "ro.json").exists()
    assert (tmp_path / "manifest.json").exists()
    assert (tmp_path / "lemmas.json").exists()
    assert manifest["shards"]["ro"]["forms"] == 1
    assert manifest["total_bytes"] > 0
    assert manifest["forms"] == 1
    assert manifest["built"]


def test_shard_files_are_compact_json_keyed_by_form(tmp_path):
    index = {"rosam": [{"lemma": "ros:noun:1", "pos": "noun", "case": "acc",
                        "number": "sg", "gender": "f"}]}
    write_assets(index, {}, tmp_path)
    raw = (tmp_path / "forms" / "ro.json").read_text()
    assert ": " not in raw and ", " not in raw
    shard = json.loads(raw)
    decoded = {form: [decode_analysis(code, str(row[0])) for row in rows for code in row[1:]]
               for form, rows in shard.items()}
    assert decoded == {"rosam": [{**index["rosam"][0], "lemma": "1"}]}


def test_every_form_lands_in_exactly_one_shard(tmp_path):
    index = {f"form{i}": [{"lemma": "x:noun:3", "pos": "noun", "case": "nom",
                           "number": "sg", "gender": "m"}] for i in range(50)}
    manifest = write_assets(index, {}, tmp_path)
    assert sum(s["forms"] for s in manifest["shards"].values()) == 50
    assert set(manifest["shards"]) == {"fo"}


def test_split_shards_can_group_by_a_key_function():
    from casus_build.shard import split_shards
    groups = split_shards(["λόγου", "λογου", "λόγος", "ἀνήρ"], max_forms=10, key_of=lambda f: f.replace("ό", "ο"))
    assert sorted(groups["λο"]) == ["λογου", "λόγος", "λόγου"]


def test_write_assets_takes_a_row_writer_and_a_prefix(tmp_path):
    from casus_build.shard import write_assets
    index = {"λόγου": [{"lemma": 3, "pos": "noun"}], "λογου": [{"lemma": 3, "pos": "noun", "marked": "λόγου"}]}
    rows = lambda analyses: [[3, *(["=" + analyses[0]["marked"]] if "marked" in analyses[0] else []), "n"]]
    m = write_assets(index, {"3": {"headword": "λόγος"}}, tmp_path, rows=rows, key_of=lambda f: f.replace("ό", "ο"))
    assert list(m["shards"]) == ["λο"]
    import json
    data = json.loads((tmp_path / "forms" / "λο.json").read_text(encoding="utf-8"))
    assert data["λογου"] == [[3, "=λόγου", "n"]]


def test_write_assets_removes_shards_left_from_an_earlier_build(tmp_path):
    from casus_build.shard import write_assets
    (tmp_path / "forms").mkdir()
    (tmp_path / "forms" / "zz.json").write_text("{}", encoding="utf-8")
    write_assets({"ab": [{"lemma": "x:noun:1", "pos": "noun", "case": "nom", "number": "sg", "gender": "f"}]}, {}, tmp_path)
    assert not (tmp_path / "forms" / "zz.json").exists()
