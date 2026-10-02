"""Shard the form index by its first two letters and write the data/ assets.

The shard rule here is mirrored by src/lib/lexicon.js (shardKey): first two
characters of the normalised form, one character for a one-letter form. A
mismatch between the two is silent total lookup failure, so change both.
"""
from __future__ import annotations

import json
from collections import defaultdict
from datetime import date
from pathlib import Path


def shard_key(form: str) -> str:
    return form[:2]


def _dump(obj) -> str:
    return json.dumps(obj, ensure_ascii=False, separators=(",", ":"), sort_keys=False)


def write_assets(index: dict, lemmas: dict, out_dir: Path) -> dict:
    """Write forms/<aa>.json, lemmas.json and manifest.json under out_dir; return the manifest."""
    out_dir = Path(out_dir)
    forms_dir = out_dir / "forms"
    forms_dir.mkdir(parents=True, exist_ok=True)

    shards: dict[str, dict] = defaultdict(dict)
    for form, analyses in index.items():
        shards[shard_key(form)][form] = analyses

    manifest_shards = {}
    total = 0
    for name in sorted(shards):
        path = forms_dir / f"{name}.json"
        data = _dump(shards[name])
        path.write_text(data, encoding="utf-8")
        size = len(data.encode("utf-8"))
        manifest_shards[name] = {"forms": len(shards[name]), "bytes": size}
        total += size

    lemmas_text = _dump(lemmas)
    (out_dir / "lemmas.json").write_text(lemmas_text, encoding="utf-8")
    total += len(lemmas_text.encode("utf-8"))

    manifest = {
        "built": date.today().isoformat(),
        "forms": len(index),
        "analyses": sum(len(v) for v in index.values()),
        "lemmas": len(lemmas),
        "shards": manifest_shards,
        "total_bytes": total,
    }
    (out_dir / "manifest.json").write_text(json.dumps(manifest, indent=1), encoding="utf-8")
    return manifest
