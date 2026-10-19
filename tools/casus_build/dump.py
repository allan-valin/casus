"""Open a Wiktextract dump whether it is stored plain or gzipped (vendor/wiktextract/*.jsonl or *.jsonl.gz; Allan's
disk filled up on 2026-10-19, so the dumps are kept compressed)."""
from __future__ import annotations

import gzip
from pathlib import Path


def dump_path(path) -> Path:
    p = Path(path)
    if p.exists():
        return p
    gz = p.with_name(p.name + ".gz")
    return gz if gz.exists() else p


def open_dump(path):
    p = dump_path(path)
    return gzip.open(p, "rt", encoding="utf-8") if p.suffix == ".gz" else p.open(encoding="utf-8")
