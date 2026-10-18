"""Shard key for Japanese (overnight plan 2026-10-19): forms are bucketed by a hash of their first two
characters, 'b' + four digits, so the splitter can merge sparse buckets and the page needs no list of
prefixes. Mirrored exactly by src/lang/ja/bucket.js (fixture tests/fixtures/ja.buckets.json)."""


def bucket(form: str) -> str:
    cps = [ord(c) for c in form[:2]]
    h = (cps[0] * 31 + (cps[1] if len(cps) > 1 else 0)) % 2048
    return f"b{h:04d}"
