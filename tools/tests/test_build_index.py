import json
import shutil
from pathlib import Path

import build_index

F = Path(__file__).parent / "fixtures"


def test_build_writes_assets_keyed_by_the_integer_lemma_id(tmp_path):
    vendor = tmp_path / "vendor"
    vendor.mkdir()
    shutil.copy(F / "dictline_sample.txt", vendor / "DICTLINE.GEN")
    shutil.copy(F / "inflects_sample.txt", vendor / "INFLECTS.LAT")
    out = tmp_path / "data"
    assert build_index.main(["--vendor", str(vendor), "--out", str(out)]) == 0

    lemmas = json.loads((out / "lemmas.json").read_text())
    glosses = json.loads((out / "glosses.en.json").read_text())
    manifest = json.loads((out / "manifest.json").read_text())
    assert all(k.isdigit() for k in lemmas), "lemmas.json must be keyed by the integer id the shards use"
    assert set(glosses) <= set(lemmas)
    shard = json.loads((out / "forms" / "ro.json").read_text())
    for rows in shard.values():
        for row in rows:
            assert str(row[0]) in lemmas
    rosa = next(r for r in lemmas.values() if r["headword"] == "rosa" and r["pos"] == "noun")
    assert rosa["dict_form"] == "rosa, -ae f."
    assert manifest["format"] == 2 and manifest["lemmas"] == len(lemmas)
    assert "rose" in glosses[next(k for k, r in lemmas.items() if r is rosa)].lower()
