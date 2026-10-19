"""CC-CEDICT (MDBG, CC BY-SA 4.0) fills what the Wiktionary extract lacks for Chinese (Allan, 2026-10-19: 都 dōu "all"
was missing, only 都 dū "capital"), and Unihan's kMandarin (Unicode licence) orders a character's readings, the most
customary first."""
from __future__ import annotations

import re
from collections.abc import Iterable, Iterator

from casus_build.zh.parse import char_pos

_MARK = {"a": "āáǎà", "e": "ēéěè", "i": "īíǐì", "o": "ōóǒò", "u": "ūúǔù", "ü": "ǖǘǚǜ"}
_LINE = re.compile(r"^(\S+) (\S+) \[([^\]]+)\] /(.+)/$")


def _syllable(s: str) -> str:
    s = s.lower().replace("u:", "ü").replace("v", "ü")
    m = re.match(r"^([a-zü]+)([1-5])$", s)
    if not m:
        return s
    body, tone = m.group(1), int(m.group(2))
    if tone == 5 or not re.search("[aeiouü]", body):
        return body                                # neutral tone, or a syllabic nasal (m2, ng4)
    # the mark goes on a or e, on the o of ou, else on the last vowel
    if "a" in body or "e" in body:
        v = "a" if "a" in body else "e"
        i = body.index(v)
    elif "ou" in body:
        i = body.index("o")
    else:
        i = max(body.rfind(c) for c in "iouü")
    return body[:i] + _MARK[body[i]][tone - 1] + body[i + 1:]


def marks(pinyin: str) -> str:
    """numbered pinyin (xue2 xiao4) → tone marks, joined as Wiktionary writes a word (xuéxiào)"""
    return "".join(_syllable(s) for s in pinyin.split())


def parse_cedict(lines: Iterable[str]) -> Iterator[dict]:
    for line in lines:
        m = _LINE.match(line.strip())
        if m and not line.startswith("#"):
            trad, simp, pin, defs = m.groups()
            yield {"trad": trad, "simp": simp, "pinyin_num": pin, "defs": [d for d in defs.split("/") if d]}


_SKIP = re.compile(r"^(surname |variant of|old variant|archaic variant|erhua variant|used in |see |abbr\. for|Japanese variant|"
                   r"(old )?name of |\(old\) )", re.I)


def _bare(p: str | None) -> str:
    import unicodedata
    return "".join(ch for ch in unicodedata.normalize("NFD", p or "") if not unicodedata.combining(ch)).replace("ü", "u")


def _key(p: str | None) -> str:
    return re.sub(r"[\s'’-]", "", (p or "").lower())


def missing_entries(have: list[dict], cedict: Iterable[dict], start_id: int, frequent: set | None = None) -> list[dict]:
    """CEDICT words and readings the Wiktionary entries do not have: proper names (capital pinyin), surnames and
    variant cross-references left out; measure-word notes (CL:…) dropped from the gloss. Proper names (capital pinyin)
    only when the frequency list has them (北京), so the data stays in budget."""
    known = {(w, _key(e.get("pinyin"))) for e in have for w in (e.get("simplified"), e.get("headword")) if w}
    toneless = {(w, _key(_bare(e.get("pinyin")))) for e in have for w in (e.get("simplified"), e.get("headword")) if w}
    frequent = frequent or set()
    out, seen = [], set()
    for c in cedict:
        name = c["pinyin_num"][:1].isupper()
        if name and c["simp"] not in frequent:
            continue
        defs = [d for d in c["defs"] if not d.startswith("CL:") and not _SKIP.match(d)]
        if not defs or len(defs) < len([d for d in c["defs"] if not d.startswith("CL:")]) / 2:
            continue                                   # mostly a cross-reference
        pin = marks(c["pinyin_num"])
        if (c["simp"], _key(pin)) in known or (c["trad"], _key(pin)) in known or (c["simp"], _key(pin)) in seen:
            continue
        if "5" in c["pinyin_num"] and (c["simp"], _key(_bare(pin))) in toneless:
            continue                                   # 学生 xuésheng: the neutral-tone variant of xuéshēng
        seen.add((c["simp"], _key(pin)))
        gloss = "; ".join(defs)
        out.append({"id": start_id + len(out), "headword": c["trad"], "simplified": c["simp"] if c["simp"] != c["trad"] else None,
                    "pos": "noun" if name else char_pos(gloss), "pinyin": pin.lower() if name else pin, **({"proper": True} if name else {}), "gloss_en": gloss, "ipa": [], "source": "cedict"})
    return out


def reading_order(lines: Iterable[str]) -> dict[str, list[str]]:
    """character → its Mandarin readings, the most customary first (Unihan kMandarin)"""
    out = {}
    for line in lines:
        parts = line.rstrip("\n").split("\t")
        if len(parts) == 3 and parts[1] == "kMandarin":
            out[chr(int(parts[0][2:], 16))] = parts[2].split()
    return out


def order_rows(index: dict, order: dict[str, list[str]]) -> dict:
    """a single character's readings in Unihan's order, the most customary first (都: dōu before dū)"""
    for key, rows in index.items():
        readings = order.get(key) if len(key) == 1 else None
        if readings:
            rows.sort(key=lambda a: readings.index(a.get("reading")) if a.get("reading") in readings else len(readings))
    return index
