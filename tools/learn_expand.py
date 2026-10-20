"""More lessons for every language, generated from Casus's own data (Allan, 2026-10-20: "I'd expect everything to
have as much lessons as jp has"). The Japanese list is long because it gives every function word and set expression
its own lesson; this does the same from each language's Wiktionary data (CC BY-SA) and its Tatoeba sentences:

- a lesson for each frequent function word — preposition, conjunction, particle, pronoun, determiner — and for the
  commonest adverbs: its meaning, the sentences that use it, and gap exercises (a preposition in a case language
  drills the case of the noun after it; a pronoun drills its own forms; the others choose among neighbouring words)
- a lesson for each of the commonest verbs: its forms in context and a present-tense table
- vocabulary lessons by frequency (40 words each) and the phrasebook (20 phrases each)

Everything is levelled by how often Tatoeba uses it, and marked `generated`: the page says it was made from
Wiktionary data, not written by a teacher. Usage: called from build_learn.py for curriculum languages."""
from __future__ import annotations

import json
import math
import re
from collections import Counter
from pathlib import Path

GROUPS = [  # part of speech, topic title, how many at most
    ("prep", ("Prepositions", "Preposições"), 200),
    ("conj", ("Conjunctions", "Conjunções"), 150),
    ("particle", ("Particles", "Partículas"), 120),
    ("pron", ("Pronouns", "Pronomes"), 150),
    ("det", ("Determiners", "Determinantes"), 100),
    ("adv", ("Adverbs", "Advérbios"), 200),
    ("verb", ("Verbs", "Verbos"), 250),
]
POS_NAME = {"prep": ("preposition", "preposição"), "conj": ("conjunction", "conjunção"), "particle": ("particle", "partícula"),
            "pron": ("pronoun", "pronome"), "det": ("determiner", "determinante"), "adv": ("adverb", "advérbio"), "verb": ("verb", "verbo")}
CONTENT = {"noun", "adj", "verb", "adv"}
WORD = re.compile(r"[\ẁ-֑ͯ-ׇً-ٟऀ-ॿ'’-]+", re.U)


ARABIC_MARKS = re.compile(r"[\u064b-\u0652\u0670\u0640]")


def key(w: str) -> str:
    """a word as it is counted: lower case; Arabic without its vowel marks (Tatoeba seldom writes them, the
    paradigms always do)"""
    return ARABIC_MARKS.sub("", w).lower()


def js_escape(s: str) -> str:
    """escape for a JavaScript unicode regex (Python's re.escape writes \\- and the like, which `u` mode rejects)"""
    return re.sub(r"([.*+?^${}()|\[\]\\/])", r"\\\1", s)


def word_counts(sentences) -> Counter:
    c = Counter()
    for s in sentences:
        c.update(key(w) for w in WORD.findall(s))
    return c


def _paradigms(data: Path) -> dict:
    out = {}
    for f in (data / "paradigms").glob("*.json"):
        for lid, rows in json.loads(f.read_text(encoding="utf-8")).items():
            forms, prev = [], None
            for row in rows:
                form = prev[: row[0]] + row[1] if isinstance(row[0], int) and prev is not None else row[0]
                prev = form
                forms.append(form)
            out[lid] = forms
    return out


def _level_of(rank: int, n: int, levels: list) -> str:
    return levels[min(len(levels) - 1, rank * len(levels) // max(1, n))]


def expand(code: str, data: Path, index: dict, lessons: dict, questions: dict, sentences, min_count: int = 20,
           cases: bool = False, vocab_words: int = 2400) -> int:
    data = Path(data)
    lemmas = json.loads((data / "lemmas.json").read_text(encoding="utf-8"))
    gl = json.loads((data / "glosses.en.json").read_text(encoding="utf-8"))
    paras = _paradigms(data)
    counts = word_counts(sentences)
    levels = [lv["id"] for lv in index["levels"]]
    topics = {lv["id"]: lv["topics"] for lv in index["levels"]}
    taken = {(l.get("title") or "").lower() for l in lessons.values()}
    added = 0

    def forms_of(lid, hw):
        return sorted({f.lower() for f in paras.get(lid, [])} | {hw.lower()})

    def count(forms):
        return sum(counts.get(k, 0) for k in {key(f) for f in forms})

    # rank each part of speech by how often its forms occur
    ranked = {}
    for lid, e in lemmas.items():
        pos, hw = e.get("pos"), e.get("headword", "")
        if not hw or " " in hw or not gl.get(lid):
            continue
        forms = forms_of(lid, hw)
        n = count(forms)
        if n >= min_count:
            ranked.setdefault(pos, []).append((n, lid, hw, forms))
    for pos in ranked:
        ranked[pos].sort(key=lambda x: (-x[0], x[2]))

    for pos, (en_title, pt_title), most in GROUPS:
        items = []
        seen = set()
        for x in ranked.get(pos, []):
            if x[2].lower() in seen or x[2].lower() in taken:
                continue
            seen.add(x[2].lower())
            items.append(x)
        items = items[:most]
        heads = [x[2] for x in items]
        per_level = {}
        for k, (n, lid, hw, forms) in enumerate(items):
            lv = _level_of(k, len(items), levels)
            lesson_id = f"{code}-w-{pos}-{lid}"
            gloss = gl[lid]
            neighbours = [h for h in heads[max(0, k - 4): k + 5] if h != hw][:6]
            if pos in ("pron", "det", "verb") and len(forms) > 1:
                match = {"seq": [{"lemma": f"^{js_escape(hw)}$", "pos": pos}]}
                pool = None
            elif pos == "prep" and cases:
                match = [{"seq": [{"word": forms}, {"pos": "noun"}], "gap": 1, "same": ["number"]},
                         {"seq": [{"word": forms}], "gap": 0, "pool": [hw, *neighbours]}]
                pool = None
            else:
                match = {"seq": [{"word": forms}], "gap": 0}
                pool = [hw, *neighbours]
            pos_en, pos_pt = POS_NAME[pos]
            shown = ", ".join(f"**{f}**" for f in forms[:12]) + (" …" if len(forms) > 12 else "")
            intro = {
                "en": f"<p><b>{hw}</b> — {gloss} ({pos_en}). "
                      + (f"Its forms: {shown.replace('**', '')}. " if len(forms) > 1 else "")
                      + f"It occurs {n} times in Casus's example sentences. The sentences below use it; then the exercises.</p>",
                "pt": f"<p><b>{hw}</b> — {gloss} ({pos_pt}; significado em inglês, do Wikcionário). "
                      + (f"Formas: {shown.replace('**', '')}. " if len(forms) > 1 else "")
                      + f"Aparece {n} vezes nas frases de exemplo do Casus. As frases abaixo o usam; depois, os exercícios.</p>",
            }
            page = {"id": lesson_id, "title": hw, "meaning": {"en": gloss, "pt": gloss}, "intro": intro, "sections": [],
                    "examples": [], "practice": [], "level": lv, "topic": {"en": en_title, "pt": pt_title}, "generated": True,
                    "match": match, "source": "Wiktionary (CC BY-SA) and Tatoeba (CC BY 2.0 FR), generated by Casus"}
            if pool:
                page["pool"] = pool
            lessons[lesson_id] = page
            questions.setdefault(lv, {})[lesson_id] = {"pools": {"gap": pool or []}, "qs": []}
            per_level.setdefault(lv, []).append({"id": lesson_id, "title": hw, "meaning": page["meaning"], "generated": True})
            added += 1
        for lv, entries in per_level.items():
            topics[lv].append({"id": f"{lv}-w-{pos}", "kind": "grammar", "title": {"en": en_title, "pt": pt_title}, "lessons": entries, "generated": True})

    # vocabulary by frequency: nouns, adjectives, verbs, adverbs with a gloss
    words = sorted((x for p in CONTENT for x in ranked.get(p, [])), key=lambda x: (-x[0], x[2]))
    seen, vocab = set(), []
    for n, lid, hw, forms in words:
        if hw.lower() not in seen:
            seen.add(hw.lower())
            vocab.append({"w": hw, "en": gl[lid].split(";")[0].strip()})
    vocab = vocab[:vocab_words]
    _chunked(code, "v", vocab, 40, ("Words", "Palavras"), levels, topics, lessons)
    added += math.ceil(len(vocab) / 40)
    phrases_file = data / "phrases.json"
    if phrases_file.exists():
        ph = [{"w": p["p"], "en": p["en"]} for p in json.loads(phrases_file.read_text(encoding="utf-8")) if p.get("p") and p.get("en")]
        _chunked(code, "p", ph, 20, ("Phrases", "Frases feitas"), levels, topics, lessons)
        added += math.ceil(len(ph) / 20)
    return added


def _chunked(code, tag, items, size, title, levels, topics, lessons):
    if not items:
        return
    chunks = [items[i:i + size] for i in range(0, len(items), size)]
    per_level = {}
    for k, chunk in enumerate(chunks):
        lv = _level_of(k, len(chunks), levels)
        lid = f"{code}-{tag}{k + 1}"
        lessons[lid] = {"id": lid, "kind": "vocab", "level": lv, "words": chunk, "generated": True,
                        "source": "Wiktionary (CC BY-SA), frequency from Tatoeba"}
        per_level.setdefault(lv, []).append({"id": lid, "title": " · ".join(w["w"] for w in chunk[:4]) + " …",
                                             "meaning": {"en": f"{len(chunk)} items", "pt": f"{len(chunk)} itens"}, "generated": True})
    for lv, entries in per_level.items():
        topics[lv].append({"id": f"{lv}-{tag}", "kind": "vocab", "title": {"en": title[0], "pt": title[1]}, "lessons": entries})
