"""Shard the form index by prefix and write the data/ assets.

Format 2, measured against the Task 7 gate in docs/DATA.md:

* a shard file maps a normalised form to rows `[lemma, code, code, ...]` — one
  row per lemma, the lemma an integer (its DICTLINE line index, the number at
  the end of `Lemma.id`), each code a short string spelling one analysis
  (`encode_analysis`/`decode_analysis`; the letter tables are below);
* shards are named by prefix: every form goes to the longest shard name that
  prefixes it. A two-letter prefix with more than `max_forms` forms is split
  by its third letter, and so on; the parent keeps the forms as short as its
  own name. `shard_key(form, names)` is the lookup rule, and
  src/lib/lexicon.js mirrors it — a mismatch is silent total lookup failure,
  so change both.
"""
from __future__ import annotations

import json
from collections import defaultdict
from datetime import date
from pathlib import Path

_POS = {"noun": "n", "adj": "a", "verb": "v", "vpar": "p", "supine": "u", "pron": "o",
        "num": "m", "adv": "d", "prep": "r", "conj": "c", "interj": "j"}
_CASE = {"nom": "n", "voc": "v", "gen": "g", "loc": "l", "dat": "d", "abl": "b", "acc": "a", "x": "x", None: "x"}
_NUMBER = {"sg": "s", "pl": "p", "x": "x"}
_GENDER = {"m": "m", "f": "f", "n": "n", "c": "c", "x": "x", None: "x"}
_DEGREE = {"pos": "p", "comp": "c", "super": "s", "x": "x"}
_TENSE = {"pres": "p", "impf": "i", "fut": "f", "perf": "r", "plup": "l", "futp": "u", "x": "x"}
_MOOD = {"ind": "i", "sub": "s", "imp": "m", "inf": "n", "ppl": "p", "x": "x"}
_VOICE = {"act": "a", "pass": "p", "x": "x"}
_CONJ = {"1": "1", "2": "2", "3": "3", "3-io": "i", "4": "4", "5": "5", "6": "6", "7": "7",
         "8": "8", "9": "9", None: "x"}
_PERSON = {"0": "0", "1": "1", "2": "2", "3": "3"}

# field order per pos; (feature name, table)
_LAYOUT = {
    "noun": (("case", _CASE), ("number", _NUMBER), ("gender", _GENDER)),
    "adj": (("case", _CASE), ("number", _NUMBER), ("gender", _GENDER), ("degree", _DEGREE)),
    "pron": (("case", _CASE), ("number", _NUMBER), ("gender", _GENDER)),
    "num": (("case", _CASE), ("number", _NUMBER), ("gender", _GENDER)),
    "supine": (("case", _CASE), ("number", _NUMBER), ("gender", _GENDER)),
    "verb": (("person", _PERSON), ("number", _NUMBER), ("tense", _TENSE), ("mood", _MOOD),
             ("voice", _VOICE), ("conj", _CONJ)),
    "vpar": (("case", _CASE), ("number", _NUMBER), ("gender", _GENDER), ("tense", _TENSE),
             ("voice", _VOICE), ("conj", _CONJ)),
    "adv": (("degree", _DEGREE),),
    "prep": (("governs", _CASE),),
    "conj": (),
    "interj": (),
}
_POS_BACK = {v: k for k, v in _POS.items()}
_BACK = {name: {v: k for k, v in table.items() if k is not None} for layout in _LAYOUT.values() for name, table in layout}
_BACK["conj"]["x"] = None   # a verb with no conjugation (UNIQUES `V 0 0`) decodes to None, as in JS


def encode_analysis(a: dict) -> str:
    pos = a["pos"]
    return _POS[pos] + "".join(table[a.get(name)] for name, table in _LAYOUT[pos])


def decode_analysis(code: str, lemma: str) -> dict:
    pos = _POS_BACK[code[0]]
    out = {"lemma": lemma, "pos": pos}
    for (name, _table), ch in zip(_LAYOUT[pos], code[1:]):
        out[name] = _BACK[name][ch]
    return out


def shard_key(form: str, names=None) -> str | None:
    """Longest shard name prefixing the form; with no names, the plain two-letter rule."""
    if names is None:
        return form[:2]
    for n in range(min(len(form), 5), 0, -1):
        if form[:n] in names:
            return form[:n]
    return None


def split_shards(forms, max_forms: int = 8000, depth: int = 2, max_depth: int = 5, key_of=None) -> dict[str, list[str]]:
    """Group forms by prefix, splitting any group over max_forms by one more letter. `key_of` maps a form to
    the string its prefix is taken from (Greek: the form without diacritics); identity by default."""
    key_of = key_of or (lambda f: f)
    groups: dict[str, list[str]] = defaultdict(list)
    for form in forms:
        groups[key_of(form)[:depth]].append(form)
    out: dict[str, list[str]] = {}
    for name, members in groups.items():
        if len(members) <= max_forms or depth >= max_depth or len(name) < depth:
            out[name] = members
            continue
        own = [f for f in members if len(key_of(f)) <= depth]
        longer = [f for f in members if len(key_of(f)) > depth]
        if own:
            out[name] = own
        out.update(split_shards(longer, max_forms, depth + 1, max_depth, key_of))
    return out


def _dump(obj) -> str:
    return json.dumps(obj, ensure_ascii=False, separators=(",", ":"))


def _lemma_int(lemma) -> int:
    """`Lemma.id` is `stems[0]:pos:index`; the index alone names the lemma on disk."""
    return int(str(lemma).rsplit(":", 1)[-1])


def _rows(analyses: list[dict]) -> list[list]:
    by_lemma: dict[int, list[str]] = {}
    for a in analyses:
        by_lemma.setdefault(_lemma_int(a["lemma"]), []).append(encode_analysis(a))
    return [[lemma, *codes] for lemma, codes in by_lemma.items()]


def write_assets(index: dict, lemmas: dict, out_dir: Path, max_forms: int = 8000, rows=None, key_of=None) -> dict:
    """Write forms/<prefix>.json, lemmas.json and manifest.json under out_dir; return the manifest."""
    out_dir = Path(out_dir)
    forms_dir = out_dir / "forms"
    forms_dir.mkdir(parents=True, exist_ok=True)
    for stale in forms_dir.glob("*.json"):   # a shard of an earlier build would be served and counted
        stale.unlink()

    manifest_shards = {}
    total = 0
    rows = rows or _rows
    for name, members in sorted(split_shards(index, max_forms, key_of=key_of).items()):
        data = _dump({form: rows(index[form]) for form in members})
        (forms_dir / f"{name}.json").write_text(data, encoding="utf-8")
        size = len(data.encode("utf-8"))
        manifest_shards[name] = {"forms": len(members), "bytes": size}
        total += size

    lemmas_text = _dump(lemmas)
    (out_dir / "lemmas.json").write_text(lemmas_text, encoding="utf-8")
    total += len(lemmas_text.encode("utf-8"))

    manifest = {
        "format": 2,
        "built": date.today().isoformat(),
        "forms": len(index),
        "analyses": sum(len(v) for v in index.values()),
        "lemmas": len(lemmas),
        "max_forms": max_forms,
        "shards": manifest_shards,
        "total_bytes": total,
    }
    (out_dir / "manifest.json").write_text(json.dumps(manifest, indent=1), encoding="utf-8")
    return manifest
