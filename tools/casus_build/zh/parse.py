"""Chinese (Mandarin) entries from the English Wiktionary's Wiktextract extract (overnight plan 2026-10-19). Entries
live under the traditional spelling and list the simplified one; both are keys. Every analysis carries its pinyin
(with tone marks) as the reading; single characters come as 'character' entries (我 I, 吃 to eat)."""
from __future__ import annotations

import json
import re
from collections.abc import Iterable, Iterator

POS = {"noun": "noun", "verb": "verb", "adj": "adj", "adv": "adv", "pron": "pron", "conj": "conj", "prep": "prep",
       "particle": "particle", "classifier": "classifier", "num": "num", "intj": "interj", "character": "char"}
_HAN = re.compile(r"[㐀-鿿豈-﫿]")


PRONOUNS = {"i", "me", "my", "you", "he", "him", "she", "her", "it", "we", "they", "this", "that", "who", "what"}


def char_pos(gloss: str) -> str:
    """a single character's part of speech, read off its first gloss (Wiktionary files them as 'character')"""
    g = gloss.strip().lower()
    first = g.split(";")[0].strip()
    if re.search(r"\b(particle|marker|used after|used before|used at the end|aspect)\b", g[:80]):
        return "particle"
    if first.startswith("to "):
        return "verb"
    if first.rstrip(".").split(",")[0].split(" (")[0].strip() in PRONOUNS:
        return "pron"
    return "noun"


def pinyin_of(d: dict) -> str | None:
    for s in d.get("sounds") or []:
        tags = set(s.get("tags") or [])
        if "Pinyin" in tags and "Mandarin" in tags and s.get("zh_pron"):
            return s["zh_pron"].split(" (")[0].strip()
    return None


def parse_entries(lines: Iterable[str]) -> Iterator[dict]:
    for i, line in enumerate(lines):
        line = line.strip()
        if not line:
            continue
        d = json.loads(line)
        pos = POS.get(d.get("pos", ""))
        word = (d.get("word") or "").strip()
        if not pos or not word or " " in word or not _HAN.search(word):
            continue
        senses = d.get("senses") or []
        if senses and all(set(x.get("tags") or []) & {"form-of", "alt-of"} for x in senses):
            continue
        simp = next((f["form"] for f in d.get("forms") or [] if "Simplified-Chinese" in (f.get("tags") or []) and "alternative" not in (f.get("tags") or [])), None)
        gloss = "; ".join(dict.fromkeys(" ".join(g.split()) for s in senses for g in (s.get("glosses") or [])[:1] if g))
        if not gloss:
            continue
        ipa = [{"ipa": s["ipa"], "tags": list(s.get("tags") or [])} for s in d.get("sounds") or [] if s.get("ipa") and "Mandarin" in (s.get("tags") or [])]
        if pos == "char":
            pos = char_pos(gloss)
        yield {"id": i, "headword": word, "simplified": simp, "pos": pos, "pinyin": pinyin_of(d), "gloss_en": gloss, "ipa": ipa[:2]}


def build_index(entries: list[dict]) -> dict[str, list[dict]]:
    index: dict[str, list[dict]] = {}
    for e in entries:
        a = {"lemma": e["id"], "pos": e["pos"], **({"reading": e["pinyin"]} if e["pinyin"] else {})}
        for key in dict.fromkeys(x for x in (e["simplified"], e["headword"]) if x):
            rows = index.setdefault(key, [])
            if a not in rows:
                rows.append(a)
    return index


def char_map(entries: list[dict]) -> dict[str, str]:
    """traditional → simplified for single characters, learned from the word entries that give both spellings (學校 /
    学校: 學 → 学); the character entries themselves often list no simplified form, and 书 alone is only a redirect"""
    out: dict[str, str] = {}
    for e in entries:
        t, s = e.get("headword") or "", e.get("simplified") or ""
        if len(t) == len(s) > 0:
            for a, b in zip(t, s):
                if a != b:
                    out.setdefault(a, b)
    return out
