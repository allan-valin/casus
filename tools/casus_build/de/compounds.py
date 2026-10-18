"""German compound splitting for display (Allan, 2026-10-18: compounds confuse learners; give each root its own
ink). A noun is split when it ends in a dictionary noun and what precedes is, after an optional linking element
(-s-, -es-, -n-, -en-, -e-, -er-), a dictionary noun, adjective, verb stem or name — itself possibly a compound.
The linking letters stay with the part before them. The fewest parts win; ties go to the longest last part."""
from __future__ import annotations

from functools import lru_cache

LINKERS = ("", "s", "es", "n", "en", "e", "er", "ns")
MIN = 3


def split_compound(word: str, nouns: set[str], other: set[str]) -> list[str] | None:
    lw = word.lower()

    def linked(split: tuple[int, ...], s: str) -> int:
        # how many parts end in a linking letter whose removal leaves a root (Geburt-s): preferred on ties
        at, n = 0, 0
        for k in split[:-1]:
            at += k
            if s[at - 1] in "sne" and s[:at - 1][-MIN:]:
                n += 1
        return n

    def better(a: tuple[int, ...], b: tuple[int, ...], s: str) -> bool:
        if len(a) != len(b):
            return len(a) < len(b)
        if linked(a, s) != linked(b, s):
            return linked(a, s) > linked(b, s)
        return a[-1] > b[-1]

    @lru_cache(maxsize=None)
    def parts(s: str) -> tuple[int, ...] | None:
        """lengths of a split of s into known roots (each with its linker), fewest parts first"""
        best = None
        if s in nouns or s in other:
            best = (len(s),)
        for i in range(MIN, len(s) - MIN + 1):
            head, tail = s[:i], s[i:]
            if tail not in nouns and not parts_tail(tail):
                continue
            for link in LINKERS:
                if link and not head.endswith(link):
                    continue
                stem = head[: len(head) - len(link)] if link else head
                if len(stem) < MIN:
                    continue
                left = (len(head),) if (stem in nouns or stem in other) else None
                if left is None:
                    sub = parts(stem)
                    if sub:
                        left = sub[:-1] + (sub[-1] + len(link),)
                if left is None:
                    continue
                right = (len(tail),) if tail in nouns else parts_tail(tail)
                cand = left + right
                if best is None or better(cand, best, s):
                    best = cand
        return best

    @lru_cache(maxsize=None)
    def parts_tail(s: str) -> tuple[int, ...] | None:
        p = parts(s) if len(s) >= 2 * MIN else None
        return p if p and len(p) > 1 else None

    split = parts(lw)
    if not split or len(split) < 2:
        return None
    out, at = [], 0
    for n in split:
        out.append(word[at:at + n])
        at += n
    return out
