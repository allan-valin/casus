"""Japanese entries and the form index from the English Wiktionary's Wiktextract extract (overnight plan
2026-10-19). A lemma keeps its reading and furigana segments from the head line's ruby (学(がっ)校(こう)); every
form is indexed in kanji and in kana, so text written either way is found; romaji is dropped."""
from __future__ import annotations

import json
import re
from collections.abc import Iterable, Iterator

from casus_build.ja.conj import conjugate

POS = {"noun": "noun", "verb": "verb", "adj": "adj", "adv": "adv", "pron": "pron", "particle": "particle",
       "conj": "conj", "intj": "interj", "suffix": "suffix", "prefix": "prefix", "counter": "counter", "num": "num",
       "det": "det", "aux": "aux"}
VERB_CLASS = {"1": "godan", "1s": "godan-iku", "2": "ichidan", "suru": "suru", "kuru": "kuru", "godan": "godan"}
TAG_FORM = [  # Wiktionary table tags -> our form names; stems that are never words alone are left out
    ({"conditional", "hypothetical"}, "cond"), ({"imperative"}, "imp"), ({"continuative", "negative"}, "zu"),
    ({"desiderative", "negative"}, "desneg"), ({"conjunctive", "negative"}, "negte"), ({"negative", "polite"}, "politeneg"),
    ({"causative"}, "caus"), ({"negative"}, "neg"), ({"volitional"}, "vol"), ({"conjunctive"}, "te"), ({"formal"}, "polite"),
    ({"polite"}, "polite"), ({"potential"}, "pot"), ({"passive"}, "pass"), ({"perfective"}, "past"), ({"past"}, "past"),
    ({"continuative"}, "stem"), ({"attributive"}, "dict"), ({"terminative"}, "dict"), ({"adverbial"}, "adv"),
    ({"adnominal"}, "attr"), ({"desiderative"}, "des"),
]
SKIP_TAGS = {"romanization", "canonical", "table-tags", "inflection-template", "imperfective", "hypothetical-stem",
             "irrealis", "realis", "error-unrecognized-form", "historical", "kyūjitai", "alternative", "counter", "noun-from-adj"}
RARE = {"uncommon", "archaic", "obsolete", "dialectal", "rare", "dated"}
_KANA = re.compile(r"^[぀-ヿー]+$")
_JA = re.compile(r"[぀-ヿ㐀-鿿豈-﫿ー々〆ヶ]")
_HIRAGANA = re.compile(r"^[\u3040-\u309fー]+$")
_SEG = re.compile(r"([぀-ヿー]*)([^぀-ヿー()\s]+)\(([^)]+)\)")


def furigana(expansion: str) -> list[list]:
    """head line -> [[text, reading or None]…]; the first spelling when the line offers several ('… or …')"""
    head = expansion.split(" • ")[0].split(" or ")[0].strip()
    out, at = [], 0
    for m in _SEG.finditer(head):
        if m.start() > at:
            out.append([head[at:m.start()], None])
        if m.group(1):
            out.append([m.group(1), None])
        out.append([m.group(2), m.group(3)])
        at = m.end()
    if at < len(head):
        out.append([head[at:], None])
    return [s for s in out if s[0]]


def reading_of(form: str, headword: str, furi: list[list], cls: str | None = None) -> str | None:
    """the kana reading of a form written with kanji: each segment of the headword that begins the form adds its
    reading (kanji) or itself (kana); where an inflection departs from the headword the rest is kana already.
    来る changes its reading: 来ない こない, 来る くる, 来ます きます."""
    if _KANA.match(form):
        return None
    if cls == "kuru" and form.startswith("来"):
        rest = form[1:]
        first = "こ" if rest[:1] in ("な", "よ", "ら", "さ", "い") else "く" if rest[:1] == "る" or rest.startswith("れば") else "き"
        return first + rest if (not rest or _KANA.match(rest)) else None
    out, at = [], 0
    for text, reading in furi:
        if form.startswith(text, at):
            out.append(reading or text)
            at += len(text)
            continue
        if reading is None:
            break                       # the inflected kana tail departs from the headword's
        return None                     # a kanji segment that does not match: not this headword's spelling
    tail = form[at:]
    if at == 0 or (tail and not _KANA.match(tail)):
        return None
    return "".join(out) + tail


def _reading(furi: list[list]) -> str:
    return "".join(r or t for t, r in furi)


def _form_name(tags: set[str]) -> str | None:
    for need, name in TAG_FORM:
        if need <= tags:
            return name
    return None


def parse_entries(lines: Iterable[str]) -> Iterator[dict]:
    for i, line in enumerate(lines):
        line = line.strip()
        if not line:
            continue
        d = json.loads(line)
        pos = POS.get(d.get("pos", ""))
        word = (d.get("word") or "").strip()
        # names (日本, 東京, トム) are nouns to the reader; a one-character or hiragana-only name would match inside
        # ordinary words, so those stay out (Allan 2026-10-27: 日本 read as "hi hon")
        if d.get("pos") == "name" and len(word) >= 2 and not _HIRAGANA.match(word):
            pos = "noun"
        if not pos or not word or " " in word or not _JA.search(word):
            continue
        heads = d.get("head_templates") or [{}]
        h = heads[0]
        args = h.get("args") or {}
        furi = furigana(h.get("expansion") or word)
        if _reading(furi).replace(" ", "") == "" or not _KANA.match(_reading(furi)):
            furi = [[word, None]] if _KANA.match(word) else furi
        reading = _reading(furi) if _KANA.match(_reading(furi)) else (args.get("1") if _KANA.match(str(args.get("1", ""))) else None)
        cls = None
        if pos == "verb":
            cls = "suru" if (h.get("name") == "ja-verb-suru" or word.endswith("する")) else VERB_CLASS.get(str(args.get("type")))
        elif pos == "adj":
            cls = {"i": "i", "na": "na"}.get(str(args.get("infl")))
        forms = []
        for f in d.get("forms") or []:
            tags = set(f.get("tags") or [])
            text = (f.get("form") or "").strip()
            if tags & SKIP_TAGS or not text or not _JA.search(text) or " " in text:
                continue
            name = _form_name(tags)
            if name:
                forms.append((text, name))
        # a kana entry's kanji spellings (さかな: 魚, 肴), which Wiktionary lists as alternatives
        kanji = [f["form"].strip() for f in d.get("forms") or [] if {"alternative", "kanji"} <= set(f.get("tags") or [])
                 and f.get("form") and _JA.search(f["form"]) and not _KANA.match(f["form"])] if _KANA.match(word) else []
        senses = d.get("senses") or []
        rare = bool(senses) and all(set(s.get("tags") or []) & RARE for s in senses)
        gloss = "; ".join(dict.fromkeys(" ".join(g.split()) for s in senses for g in (s.get("glosses") or [])[:1] if g))
        ipa = [{"ipa": s["ipa"], "tags": list(s.get("tags") or [])} for s in d.get("sounds") or [] if s.get("ipa")]
        yield {"id": i, "headword": word, "reading": reading, "furi": furi, "pos": pos, "cls": cls, "forms": forms,
               "gloss_en": gloss, "ipa": ipa[:3], "kanji": kanji, "rare": rare}


def build_index(entries: list[dict], reading_rank: dict | None = None) -> dict[str, list[dict]]:
    """reading_rank: "form\treading" -> rank (JLPT lists, N5 first); the commoner reading of a form
    goes first"""
    reading_rank = reading_rank or {}
    index: dict[str, list[dict]] = {}
    rare_lemmas: set = set()
    main_spelling: set = set()                   # (kanji, lemma) where a kana main entry names the kanji

    def add(form: str, a: dict):
        form = form.strip()
        if not form:
            return
        rows = index.setdefault(form, [])
        if a not in rows:
            rows.append(a)

    for e in entries:
        base = {"lemma": e["id"], "pos": e["pos"]}

        def with_reading(form: str, a: dict) -> dict:
            r = reading_of(form, e["headword"], e["furi"], e["cls"]) if e["furi"] and any(x for _t, x in e["furi"]) else None
            return {**a, "reading": r} if r and r != form else a
        inflects = e["pos"] in ("verb", "adj") and e["cls"]
        for spelling in dict.fromkeys(x for x in (e["headword"], e["reading"]) if x):
            # a kanji word found through its kana spelling is marked, so a word spelled that way wins (は: the
            # particle, not 歯 tooth)
            via_kana = spelling != e["headword"] and not _KANA.match(e["headword"])
            if not inflects:
                add(spelling, with_reading(spelling, {**base, "form": "kana"} if via_kana else base))
                continue
            if e["cls"] == "suru" and not spelling.endswith("する"):
                spelling += "する"
            for name, texts in conjugate(spelling, e["cls"]).items():
                for t in texts:
                    add(t, with_reading(t, {**base, "form": name}))
        for text, name in e["forms"]:
            add(text, with_reading(text, {**base, "form": name} if e["pos"] in ("verb", "adj") else base))
        if e["pos"] in ("verb", "adj") and not inflects:
            add(e["headword"], {**base, "form": "dict"})
        if not inflects:
            for k in e.get("kanji") or []:
                add(k, {**base, "reading": e["headword"]})
                main_spelling.add((k, e["id"]))
        if e.get("rare"):
            rare_lemmas.add(e["id"])
    # a reading whose every sense is uncommon, archaic or dialectal last (うお), then the commoner reading (JLPT), then
    # the kana main entry's (Wiktionary keeps native words under kana: 魚 さかな)
    for form, rows in index.items():
        rows.sort(key=lambda a: (a["lemma"] in rare_lemmas,
                                 reading_rank.get(f"{form}\t{a.get('reading') or form}", 10**6),
                                 (form, a["lemma"]) not in main_spelling))
    return index


def jlpt_ranks(folder) -> dict:
    """"form\treading" -> rank from the JLPT lists (open-anki-jlpt-decks, MIT), N5 first"""
    import csv
    from pathlib import Path
    ranks: dict = {}
    for n in (5, 4, 3, 2, 1):
        p = Path(folder) / f"jlpt_n{n}.csv"
        if not p.exists():
            continue
        with open(p, encoding="utf-8") as f:
            for row in csv.DictReader(f):
                ranks.setdefault(f"{row['expression']}\t{row['reading']}", len(ranks))
    return ranks
