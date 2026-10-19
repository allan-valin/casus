#!/usr/bin/env python3
"""Stream a language's Wiktextract dump from kaikki.org and keep only what Casus uses (overnight 2026-10-19: the disk is
95% full and the Finnish dump alone is 4.6 GB): words among the language's commonest subtitle words, or with a form
among them; closed classes in full; phrases and proverbs. Writes vendor/wiktextract/kaikki.org-dictionary-<Name>.jsonl
(the name the builders expect) and the frequency list to vendor/wordlists/<code>/<code>_50k.txt.

usage: python3 tools/fetch_filtered.py Finnish fi"""
from __future__ import annotations

import gzip
import json
import sys
import urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
CLOSED = {"pron", "det", "prep", "postp", "conj", "particle", "intj", "num", "article", "adv"}
UA = {"User-Agent": "casus-build/1.0 (https://github.com/allan-valin/casus)"}


def keep_entry(d: dict, common: set[str] | None) -> bool:
    """common None: keep every word and name (Allan, 2026-10-19: literary words were missing after the frequency cut)"""
    pos = d.get("pos")
    word = (d.get("word") or "").lower()
    if pos in ("character", "romanization", "soft-redirect") or (pos == "name" and common is not None):
        return False
    if common is None:
        return True
    if pos in ("phrase", "proverb") or pos in CLOSED:
        return True
    if word in common:
        return True
    return any((f.get("form") or "").lower() in common for f in d.get("forms") or [])


def main(name: str, code: str, freq_code: str | None = None, keep_all: bool = False, local: bool = False) -> None:
    freq_code = freq_code or code
    wl = ROOT / "vendor" / "wordlists" / code
    wl.mkdir(parents=True, exist_ok=True)
    fpath = wl / f"{code}_50k.txt"
    if not fpath.exists():
        url = f"https://raw.githubusercontent.com/hermitdave/FrequencyWords/master/content/2018/{freq_code}/{freq_code}_50k.txt"
        with urllib.request.urlopen(urllib.request.Request(url, headers=UA), timeout=120) as r:
            fpath.write_bytes(r.read())
    common = None if keep_all else {l.split()[0].lower() for l in fpath.read_text(encoding="utf-8").splitlines() if l.split()}
    dest = ROOT / "vendor" / "wiktextract" / f"kaikki.org-dictionary-{name.replace(' ', '')}.jsonl.gz"   # kept compressed (2026-10-19)
    url = f"https://kaikki.org/dictionary/{name.replace(' ', '%20')}/kaikki.org-dictionary-{name.replace(' ', '')}.jsonl"
    kept = seen = 0
    # --local: re-filter the full dump already on disk instead of downloading (Finnish in full is 714 MB of data)
    tmp = dest.with_name(dest.name + ".tmp")
    source = gzip.open(dest, "rb") if local else urllib.request.urlopen(urllib.request.Request(url, headers=UA), timeout=300)
    with source as r, gzip.open(tmp if local else dest, "wt", encoding="utf-8") as out:
        for raw in r:
            seen += 1
            line = raw.decode("utf-8")
            d = json.loads(line)
            if keep_entry(d, common):
                out.write(line if line.endswith("\n") else line + "\n")
                kept += 1
    if local:
        tmp.replace(dest)
    (dest.parent / f"{dest.name[:-3]}.FETCHED").write_text("filtered\n")
    print(f"{name}: kept {kept} of {seen} entries -> {dest.name} ({dest.stat().st_size // 1_000_000} MB)")


if __name__ == "__main__":
    args = [a for a in sys.argv[1:] if a not in ("--all", "--local")]
    main(*args, keep_all="--all" in sys.argv, local="--local" in sys.argv)
