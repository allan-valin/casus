#!/usr/bin/env python3
"""The Learn tab's lessons (Allan, 2026-10-19; design 2026-10-19-learn-and-three-sites-design.md §2):
data/<code>/learn.json — levels, each with units of lessons, each lesson with what the page needs to teach and to
ask about it. Japanese from OpenJLPT (CC BY-SA 4.0: grammar points written by its contributors, vocabulary and kanji
levels from Jonathan Waller, CC BY), vendored in vendor/openjlpt/.

Usage: python3 tools/build_learn.py ja"""
from __future__ import annotations

import csv
import json
import re
import zlib
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]


def units_of(items: list, size: int) -> list[list]:
    """items in groups of `size`, in order; a tail shorter than half a group joins the group before it"""
    groups = [items[k:k + size] for k in range(0, len(items), size)]
    if len(groups) > 1 and len(groups[-1]) < size / 2:
        tail = groups.pop()
        groups[-1] = groups[-1] + tail
    return groups


def _rows(path: Path) -> list[dict]:
    if not path.exists():
        return []
    with path.open(encoding="utf-8") as f:
        return list(csv.DictReader(f))


def _gap(furi: list, target: str) -> list | None:
    """the sentence with its first piece equal to the target replaced by a blank"""
    out, done = [], False
    for text, reading in furi:
        if not done and reading is None and text == target:
            out.append(["＿＿", None])
            done = True
        else:
            out.append([text, reading])
    return out if done else None


def ja_learn(book: Path, openjlpt: Path) -> tuple[dict, dict, dict]:
    """(index, lessons by id, questions by level and lesson) — grammar from JLPT Grammar Enhanced in its own
    teaching order and topics, vocabulary and kanji by level from OpenJLPT"""
    from learn_ja import parse_page, summary
    levels, lessons, questions = [], {}, {}
    plan = {lv["level"]: lv["topics"] for lv in summary((book / "SUMMARY.md").read_text(encoding="utf-8"))}
    for n in ("N5", "N4", "N3", "N2", "N1"):
        topics = []
        for t_k, topic in enumerate(plan.get(n, []), 1):
            entries = []
            for path in topic["pages"]:
                f = book / path
                if not f.exists():
                    continue
                lesson = parse_page(f.read_text(encoding="utf-8"))
                lid = f"{n.lower()}-{f.stem.split('-')[0]}"
                lesson.update({"id": lid, "level": n, "topic": topic["title"], "source": "JLPT Grammar Enhanced (CC BY-SA 4.0)"})
                lessons[lid] = lesson
                entries.append({"id": lid, "title": lesson["title"], "meaning": lesson["meaning"]})
            if entries:
                topics.append({"id": f"ja-{n}-t{t_k}", "kind": "grammar", "title": topic["title"], "lessons": entries})
        # questions: the gap in each example (the bold part), its translation, the lesson's meaning
        level_lessons = [lessons[e["id"]] for t in topics for e in t["lessons"]]
        targets = sorted({ex["target"] for l in level_lessons for ex in l["examples"] if ex["target"]})
        meanings = [l["meaning"] for l in level_lessons if l["meaning"]]
        qs = {}
        for l in level_lessons:
            mine = []
            sentences = [ex["en"] for ex in l["examples"]]
            for ex in l["examples"]:
                gap = _gap(ex["furi"], ex["target"]) if ex["target"] else None
                if gap:
                    mine.append({"type": "gap", "furi": gap, "en": ex["en"], "answer": ex["target"]})
                mine.append({"type": "translate", "furi": ex["furi"], "kana": ex["kana"], "answer": ex["en"]})
            if l["meaning"]:
                mine.append({"type": "meaning", "prompt": l["title"], "answer": l["meaning"], "pool": [m for m in meanings if m != l["meaning"]][:60]})
            # wrong answers for the gaps are stored once per file: the level's patterns (questionsFromFile)
            qs[l["id"]] = {"pools": {"gap": targets[:80]}, "qs": mine}
        questions[n] = qs
        words = [{"w": r["word"], "reading": r["reading"], "en": r["meanings"].split(";")[0].strip()} for r in _rows(openjlpt / f"vocab-{n.lower()}.csv") if r["word"]]
        groups = units_of(words, 40)
        if groups:
            topics.append({"id": f"ja-{n}-words", "kind": "vocab", "title": "Words", "lessons": [
                {"id": f"{n.lower()}-v{k}", "title": " · ".join(w["w"] for w in g[:3]) + " …", "meaning": f"{len(g)} words"} for k, g in enumerate(groups, 1)]})
            for k, g in enumerate(groups, 1):
                lessons[f"{n.lower()}-v{k}"] = {"id": f"{n.lower()}-v{k}", "kind": "vocab", "level": n, "words": g, "source": "OpenJLPT (levels: J. Waller, CC BY)"}
        kanji = [{"k": r["character"], "on": r["onyomi"], "kun": r["kunyomi"], "en": r["meanings"].split(";")[0].strip(),
                  "words": [w.strip() for w in r["words"].split(";") if w.strip()][:4]} for r in _rows(openjlpt / f"kanji-{n.lower()}.csv")]
        kgroups = units_of(kanji, 20)
        if kgroups:
            topics.append({"id": f"ja-{n}-kanji", "kind": "kanji", "title": "Kanji", "lessons": [
                {"id": f"{n.lower()}-k{k}", "title": "".join(c["k"] for c in g[:8]) + " …", "meaning": f"{len(g)} kanji"} for k, g in enumerate(kgroups, 1)]})
            for k, g in enumerate(kgroups, 1):
                lessons[f"{n.lower()}-k{k}"] = {"id": f"{n.lower()}-k{k}", "kind": "kanji", "level": n, "kanji": g, "source": "OpenJLPT (KANJIDIC, CC BY-SA)"}
        levels.append({"id": n, "topics": topics})
    index = {"system": "JLPT", "levels": levels,
             "credit": "Grammar: JLPT Grammar Enhanced (github.com/maitodesu/jlpt-grammar-enhanced), CC BY-SA 4.0. Words and kanji: OpenJLPT (CC BY-SA 4.0), levels after Jonathan Waller (CC BY)."}
    return index, lessons, questions


def la_learn(book: str, plan_path: Path) -> tuple[dict, dict, dict]:
    """Latin: D'Ooge's lessons as the book has them, in the stages, topics and rules of tools/curricula/la/plan.yml;
    each lesson's vocabulary as word questions, its Latin sentences for the gap exercises (tools/learn_curriculum.mjs)"""
    import yaml
    from learn_la import lessons_of
    plan = yaml.safe_load(plan_path.read_text(encoding="utf-8"))
    book_lessons = {l["number"]: l for l in lessons_of(book)}
    both = lambda en, pt: {"en": en, "pt": pt}   # noqa: E731
    levels, lessons, questions = [], {}, {}
    for st in plan["stages"]:
        topics, qs = [], {}
        all_vocab = [v for t in st["topics"] for x in t["lessons"] for v in book_lessons.get(x["n"], {}).get("vocab", [])]
        for t_k, topic in enumerate(st["topics"], 1):
            entries = []
            for x in topic["lessons"]:
                b = book_lessons.get(x["n"])
                if not b:
                    continue
                lid = f"la-{x['n']}"
                sections = [{"id": "lesson", "title": both("The lesson", "A lição (em inglês, do livro)"), "html": b["html"]}]
                if b["vocab"]:
                    rows = "".join(f"<tr><td><b>{la}</b></td><td>{en}</td></tr>" for la, en in b["vocab"])
                    sections.append({"id": "vocab", "title": both("Vocabulary", "Vocabulário"), "html": f"<table>{rows}</table>"})
                if b["exercises_html"]:
                    sections.append({"id": "book-exercises", "title": both("The book's exercises", "Exercícios do livro"), "html": b["exercises_html"]})
                page = {"id": lid, "title": f"{x['n']} · {b['title']}", "meaning": x["meaning"], "intro": "", "sections": sections,
                        "examples": [], "practice": [], "level": st["id"], "topic": topic["title"], "match": x["match"],
                        "drill": b["drill"], "source": "D'Ooge, Latin for Beginners (1909), public domain"}
                if x.get("pool"):
                    page["pool"] = x["pool"]
                lessons[lid] = page
                entries.append({"id": lid, "title": page["title"], "meaning": x["meaning"]})
                ens = [en for _, en in all_vocab]
                las = [la for la, _ in all_vocab]
                mine = []
                for la, en in b["vocab"]:
                    mine.append({"type": "word", "prompt": la, "answer": en, "pool": [e for e in ens if e != en][:40]})
                    mine.append({"type": "word-back", "prompt": en, "answer": la, "pool": [w for w in las if w != la][:40]})
                qs[lid] = {"pools": {"gap": x.get("pool", [])}, "qs": mine}
            if entries:
                topics.append({"id": f"la-{st['id']}-t{t_k}", "kind": "grammar", "title": topic["title"], "lessons": entries})
        levels.append({"id": st["id"], "title": st["title"], "topics": topics})
        questions[st["id"]] = qs
    return {"system": plan["system"], "levels": levels, "credit": plan["credit"]}, lessons, questions


def de_learn(book: Path, plan_path: Path) -> tuple[dict, dict, dict]:
    """German: Grimm Grammar's pages as lessons (tools/learn_de.py) in the levels, topics and rules of
    tools/curricula/de/plan.yml; its examples as the lesson's own questions, its exercise sets as the book's"""
    import yaml
    from learn_de import parse_key, parse_page
    plan = yaml.safe_load(plan_path.read_text(encoding="utf-8"))
    key = parse_key((book / "answer_key.html").read_text(encoding="utf-8", errors="replace"))
    levels, lessons, questions = [], {}, {}
    for lv in plan["levels"]:
        topics, qs = [], {}
        for t_k, topic in enumerate(lv["topics"], 1):
            entries = []
            for x in topic["lessons"]:
                f = book / f"{x['page']}.html"
                if not f.exists():
                    continue
                p = parse_page(f.read_text(encoding="utf-8", errors="replace"))
                lid = f"de-{x['page']}"
                examples = [{"text": e["text"], "en": e["en"], **({"target": e["target"]} if e.get("target") else {})} for e in p["examples"]]
                page = {"id": lid, "title": p["de"], "meaning": x["meaning"], "intro": "", "level": lv["id"], "topic": topic["title"],
                        "sections": [{"id": "lesson", "title": {"en": p["en"][:1].upper() + p["en"][1:], "pt": "A lição (em inglês, da Grimm Grammar)"}, "html": p["html"]}],
                        "examples": examples, "practice": [], "match": x["match"], "source": "Grimm Grammar (COERLL, UT Austin), CC BY 4.0"}
                for k in ("pool", "swaps", "prefixes", "suffixes"):
                    if x.get(k):
                        page[k] = x[k]
                lessons[lid] = page
                entries.append({"id": lid, "title": p["de"], "meaning": x["meaning"]})
                mine = []
                for e in examples:
                    t = e.get("target")
                    if t and t in e["text"]:
                        a, b = e["text"].split(t, 1)
                        mine.append({"type": "gap", "furi": [s for s in [[a, None], ["＿＿", None], [b, None]] if s[0]], "en": e["en"], "answer": t})
                    mine.append({"type": "translate", "furi": [[e["text"], None]], "answer": e["en"]})
                # the page's exercise sets, answers from the site's key
                for name, st in key.items():
                    if not name.startswith(x["page"] + "_"):
                        continue
                    for it in st["items"]:
                        if st["kind"] == "fib" and st["bank"]:
                            a, b = it["text"].split("＿＿", 1) if "＿＿" in it["text"] else (it["text"], "")
                            mine.append({"type": "gap", "source": "book", "task": st["task"], "furi": [s for s in [[a, None], ["＿＿", None], [b, None]] if s[0]],
                                         "answer": it["answer"], "pool": [w for w in st["bank"] if w != it["answer"]]})
                        elif st["kind"] == "mcr" and it.get("options"):
                            pool = [o for o in it["options"] if o != it["answer"]]
                            if "＿＿" in it["prompt"]:
                                a, b = it["prompt"].split("＿＿", 1)
                                mine.append({"type": "gap", "source": "book", "task": st["task"], "furi": [s for s in [[a, None], ["＿＿", None], [b, None]] if s[0]], "answer": it["answer"], "pool": pool})
                            else:
                                mine.append({"type": "choice", "source": "book", "task": st["task"], "prompt": it["prompt"], "answer": it["answer"], "pool": pool})
                qs[lid] = {"pools": {"gap": x.get("pool", [])}, "qs": mine}
            if entries:
                topics.append({"id": f"de-{lv['id']}-t{t_k}", "kind": "grammar", "title": topic["title"], "lessons": entries})
        levels.append({"id": lv["id"], "topics": topics})
        questions[lv["id"]] = qs
    # levels Grimm has no pages for, written for Casus (AI-tagged): a written level of the same id adds its topics
    from learn_curriculum import written_levels
    more, more_lessons, more_qs = written_levels(plan_path.parent, plan.get("written", []), (ROOT / "data" / "de", attested_words("de"), False))
    for lv in more:
        same = next((x for x in levels if x["id"] == lv["id"]), None)
        if same:
            same["topics"] += lv["topics"]
            questions[lv["id"]].update(more_qs[lv["id"]])
        else:
            levels.append(lv)
            questions[lv["id"]] = more_qs[lv["id"]]
    lessons.update(more_lessons)
    return {"system": plan["system"], "levels": levels, "credit": plan["credit"]}, lessons, questions


def agfe_grc(index: dict, lessons: dict, questions: dict) -> None:
    """Ancient Greek for Everyone (CC BY 4.0): its 48 chapters as lessons, chapters 1–20 Beginner, the rest
    Intermediate; each chapter's rule picks the Greek sentences its exercises come from; the book's own exercise
    sentences join the Greek corpus (vendor/corpora/grc/agfe.txt)"""
    import html as _h
    import re
    from learn_agfe import agfe_lessons, exercise_sentences
    folder = ROOT / "vendor" / "agfe" / "html"
    toc = (folder / "toc.html").read_text(encoding="utf-8")
    titles = {}
    for m in re.finditer(r'href="https://pressbooks.pub/ancientgreek/chapter/(\d+)/"[^>]*>(.*?)</a>', toc, re.S):
        t = re.sub(r"\s+", " ", _h.unescape(re.sub(r"<[^>]+>", "", m.group(2)))).strip()
        titles[int(m.group(1))] = re.sub(r"^\d+\.\s*", "", t)
    v = lambda **k: {"seq": [{"pos": "verb", **k}], "same": ["person", "number"]}   # noqa: E731
    n = lambda **k: {"seq": [{"pos": ["noun", "adj"], **k}], "same": ["case", "number"]}   # noqa: E731
    rules = {
        1: {"seq": [{"re": "[ηωήώῆῶ]", "pos": ["noun", "verb", "adj"]}]}, 2: {"seq": [{"re": "[θφχψξζ]", "pos": ["noun", "verb", "adj"]}]},
        3: {"seq": [{"re": "[ἁἑἡἱὁὑὡῥ]", "pos": ["noun", "verb", "adj", "pron"]}]},
        4: v(tense="pres", mood="ind", voice="act"), 5: {"seq": [{"pos": "verb", "lemma": "^(εἰμί|ἔχω)$"}], "same": ["person", "number"]},
        6: {"seq": [{"pos": "verb", "lemma": "^(δίδωμι|τίθημι|ἵστημι|ἵημι|εἰμί|ἔχω)$"}], "same": ["person", "number"]},
        7: n(pos="noun", case=["nom", "acc"]), 8: {"seq": [{"pos": "noun", "case": "acc"}], "same": ["number"]},
        9: n(pos="noun", case=["gen", "dat"]), 10: {"seq": [{"word": ["καί", "ἀλλά", "ἀλλ’", "δέ", "δ’", "γάρ", "οὖν", "τε", "ἤ", "οὔτε", "εἴτε", "ἐπεί", "ὅτι", "διό"]}], "gap": 0},
        11: {"seq": [{"pos": "pron", "lemma": "^(ἐγώ|σύ|ἡμεῖς|ὑμεῖς)$"}], "same": ["number"]},
        12: {"seq": [{"pos": "pron", "lemma": "^(αὐτός|οὗτος|ἐκεῖνος|ὅδε)$"}], "same": ["case", "number"]},
        13: {"seq": [{"pos": "prep"}, {"pos": ["noun", "det"]}], "gap": 1, "same": ["number"]},
        14: v(tense="pres", mood="ind", voice="act", lemma="ω$"), 15: v(tense="fut", mood="ind"), 16: v(tense="fut"),
        17: {"seq": [{"pos": "verb", "lemma": "(άω|έω|όω)$", "tense": ["pres", "impf"]}], "same": ["tense", "mood", "voice"]},
        18: {"seq": [{"pos": "verb", "lemma": "(άω|έω|όω)$"}], "same": ["tense", "mood", "voice"]},
        19: {"seq": [{"pos": "noun", "dict": "(ας|ης) [fm]\\.$"}], "same": ["number"]}, 20: {"seq": [{"pos": "noun", "dict": "ου [mn]\\.$"}], "same": ["number"]},
        21: v(tense=["pres", "impf"], voice=["mid", "mp"]), 22: v(voice=["mid", "mp"]),
        23: {"seq": [{"pos": "noun", "dict": ", \\S+ος( [mfn]\\.)?$"}], "same": ["number"]}, 24: {"seq": [{"pos": "noun", "lemma": "ος$", "dict": "(ους|εος) n\\.$"}], "same": ["number"]},
        25: {"seq": [{"word": ["ὅς", "ἥ", "ὅ", "οὗ", "ἧς", "ᾧ", "ᾗ", "ὅν", "ἥν", "οἵ", "αἵ", "ἅ", "ὧν", "οἷς", "αἷς", "οὕς", "ἅς"]}], "gap": 0},
        26: {"seq": [{"pos": "pron", "lemma": "^(τίς|τις|ὅστις)$"}], "same": ["case", "number"]},
        27: {"seq": [{"pos": "verb", "mood": "inf"}], "same": ["mood"]}, 28: v(tense="impf", mood="ind"),
        29: {"seq": [{"pos": "adj"}], "same": ["case", "number"]}, 30: {"seq": [{"pos": "adj", "lemma": "^(πᾶς|ἅπας|ἀληθής|σαφής|εὐδαίμων|σώφρων|ταχύς|ἡδύς|μέγας|πολύς)$"}], "same": ["case", "number"]},
        31: v(tense="aor", mood="ind", voice="act"), 32: v(tense="aor", mood="ind"),
        33: {"seq": [{"pos": ["adv", "num"]}], "gap": 0}, 34: v(tense="aor", voice="mid"), 35: v(tense="aor", voice="pass"),
        36: {"seq": [{"pos": "adj", "re": "(τερ|τατ)[οηαωᾳῃῳ]|ιστ[οηαω]"}], "same": ["case", "number"]},
        37: {"seq": [{"pos": "vpar"}], "same": ["case", "number", "gender"]}, 38: {"seq": [{"pos": "vpar", "tense": "aor"}], "same": ["case", "number"]},
        39: {"seq": [{"pos": ["noun", "pron"], "case": "gen"}, {"pos": "vpar", "case": "gen"}], "near": 2, "gap": 1, "same": ["case", "number", "gender"]},
        40: {"seq": [{"pos": "noun", "case": "voc"}], "same": ["number"]}, 41: {"seq": [{"pos": "verb", "mood": "imp"}], "same": ["mood"]},
        42: v(tense=["perf", "plup"], voice="act"), 43: v(tense=["perf", "plup"]), 44: v(tense=["perf", "plup"], voice=["mid", "mp", "pass"]),
        45: {"seq": [{"word": ["μέν", "δέ", "γε", "δή", "μήν", "τοι", "ἄρα", "που", "πως", "οἶδα", "χρή", "δεῖ"]}], "gap": 0},
        46: v(mood="sub"), 47: v(mood="opt"), 48: {"seq": [{"word": ["εἰ", "ἐάν", "ἄν", "ἂν"]}, {"pos": "verb"}], "near": 4, "gap": 0},
    }
    print(f"grc: {agfe_lessons(folder, titles, index, lessons, questions, levels={k: 'Beginner' if k <= 20 else 'Intermediate' for k in titles}, rules=rules)} lessons from Ancient Greek for Everyone")
    sents = [s for k in sorted(titles) if (folder / f"chapter__{k}.html").exists() for s in exercise_sentences((folder / f"chapter__{k}.html").read_text(encoding="utf-8"))]
    (ROOT / "vendor" / "corpora" / "grc").mkdir(parents=True, exist_ok=True)
    (ROOT / "vendor" / "corpora" / "grc" / "agfe.txt").write_text("\n".join(dict.fromkeys(sents)) + "\n", encoding="utf-8")


BUILDERS = {"ja": lambda: ja_learn(ROOT / "vendor" / "jlpt-grammar-enhanced", ROOT / "vendor" / "openjlpt")}
BUILDERS["de"] = lambda: de_learn(ROOT / "vendor" / "grimm", ROOT / "tools" / "curricula" / "de" / "plan.yml")
def tatoeba_pairs(t3: str, limit_len: int = 30) -> list:
    """(sentence, English, Portuguese) from Tatoeba for a language, short ones"""
    import bz2
    T = ROOT / "vendor" / "tatoeba"
    rows = lambda f: (line.rstrip("\n").split("\t") for line in bz2.open(T / f, "rt", encoding="utf-8"))   # noqa: E731
    own = {r[0]: r[2] for r in rows(f"{t3}_sentences.tsv.bz2") if len(r) > 2 and len(r[2]) <= limit_len}
    to_en, to_pt = {}, {}
    for a, b in rows(f"{t3}-eng_links.tsv.bz2"):
        if a in own:
            to_en.setdefault(a, b)
    try:
        for a, b in rows(f"{t3}-por_links.tsv.bz2"):
            if a in own:
                to_pt.setdefault(a, b)
    except FileNotFoundError:
        pass
    want = set(to_en.values()) | set(to_pt.values())
    en = {r[0]: r[2] for r in rows("eng_sentences.tsv.bz2") if r[0] in want}
    pt = {r[0]: r[2] for r in rows("por_sentences.tsv.bz2") if r[0] in want}
    return [(t, en[to_en[i]], pt.get(to_pt.get(i))) for i, t in own.items() if to_en.get(i) in en]


def zh_builder():
    import yaml
    from learn_zh import zh_learn
    notes = yaml.safe_load((ROOT / "tools" / "curricula" / "zh" / "notes.yml").read_text(encoding="utf-8"))
    import gzip
    import re
    # characters only traditional writing uses (CC-CEDICT: in a traditional headword, in no simplified one): Tatoeba
    # mixes traditional sentences in; the lessons are in simplified characters
    trad, simp = set(), set()
    with gzip.open(ROOT / "vendor" / "cedict" / "cedict_1_0_ts_utf-8_mdbg.txt.gz", "rt", encoding="utf-8") as f:
        for line in f:
            m = re.match(r"^(\S+) (\S+) ", line)
            if m:
                trad.update(m.group(1))
                simp.update(m.group(2))
    avoid = "".join(sorted(c for c in trad - simp if "\u3400" <= c <= "\u9fff"))
    pairs = [p for p in tatoeba_pairs("cmn") if not any(c in avoid for c in p[0])]
    index, lessons, questions = zh_learn(ROOT / "vendor" / "hsk30" / "hsk30-grammar.csv", ROOT / "vendor" / "hsk30" / "hsk30.csv",
                                         ROOT / "vendor" / "cedict" / "cedict_1_0_ts_utf-8_mdbg.txt.gz", notes, sentences=pairs)
    index["avoid"] = avoid
    return index, lessons, questions


BUILDERS["zh"] = zh_builder
BUILDERS["la"] = lambda: la_learn((ROOT / "vendor" / "dooge" / "dooge.html").read_text(encoding="utf-8"), ROOT / "tools" / "curricula" / "la" / "plan.yml")


TATOEBA = {"mk": "mkd", "ar": "ara", "grc": "grc", "de": "deu", "ru": "rus", "ko": "kor", "zh": "cmn", "fi": "fin", "el": "ell",
           "sa": "san", "cs": "ces", "pl": "pol", "tr": "tur", "hu": "hun", "is": "isl", "pt": "por", "en": "eng", "es": "spa", "la": "lat"}


def attested_words(code: str) -> dict:
    """how often each word occurs in the language's Tatoeba sentences and open texts (vendor/corpora/<code>/)"""
    import bz2
    import collections
    import re
    texts = []
    f = ROOT / "vendor" / "tatoeba" / f"{TATOEBA.get(code, code)}_sentences.tsv.bz2"
    if f.exists():
        texts += [line.split("\t")[-1] for line in bz2.open(f, "rt", encoding="utf-8")]
    for t in (ROOT / "vendor" / "corpora" / code).glob("*.txt") if (ROOT / "vendor" / "corpora" / code).exists() else []:
        texts += t.read_text(encoding="utf-8").splitlines()
    return collections.Counter(w for t in texts for w in re.findall(r"[^\W\d_]+", t))


def builder(code: str):
    """the Japanese book, or a curriculum written for Casus (tools/curricula/<code>/ or <code>.yml)"""
    if code in BUILDERS:
        return BUILDERS[code]
    from learn_curriculum import curriculum_learn
    for path in (ROOT / "tools" / "curricula" / code, ROOT / "tools" / "curricula" / f"{code}.yml"):
        if path.exists():
            return lambda: curriculum_learn(path, (ROOT / "data" / code, attested_words(code), code == "grc"))
    raise SystemExit(f"no Learn source for {code}")


# languages whose lessons are extended with generated ones (tools/learn_expand.py): spaced scripts (word counts are
# word-based), and Japanese already has its 1,160 lessons; case languages drill the noun after each preposition
FOREIGN_WIKIBOOKS = {
    "en": ["pt:Inglês", "es:Inglés"], "it": ["en:Italian", "it:Italiano L2", "de:Italienisch", "fr:Enseignement de l'italien", "nl:Italiaans"],
    "is": ["en:Icelandic", "de:Isländisch", "pt:Islandês"], "uk": ["en:Ukrainian", "uk:Українська мова", "ru:Украинский язык", "pl:Ukraiński"],
    "pl": ["en:Polish", "de:Polnisch", "fr:Polonais", "nl:Pools"], "mk": ["en:Macedonian"], "cs": ["cs:Čeština", "en:Czech"], "hu": ["en:Hungarian"],
    "el": ["pt:Grego moderno"], "lt": ["en:Lithuanian", "de:Litauisch"], "he": ["en:Hebrew", "de:Hebräisch", "pt:Hebraico"], "sh": ["en:Serbo-Croatian", "en:Serbian", "en:Croatian", "de:Kroatisch"], "ro": ["en:Romanian"],
    "fi": ["en:Finnish", "fi:Suomen kieli", "pt:Finlandês", "es:Finés"],
    "grc": ["en:Ancient Greek", "fr:Grec ancien", "it:Greco antico", "nl:Oudgrieks"],
    "la": ["en:Latin", "de:Latein", "it:Latino", "fr:Latin", "pt:Latim", "tr:Latince", "fi:Latinan kieli"],
    "pt": ["en:Portuguese", "pt:Português para estrangeiros", "es:Portugués"], "es": ["es:Aprender español", "de:Spanisch"],
    "fr": ["es:Francés", "nl:Frans"], "de": ["es:Alemán", "pl:Niemiecki"], "nl": ["fr:Néerlandais"],
    "ko": ["en:Korean", "fr:Coréen"], "zh": ["en:Chinese (Mandarin)", "es:Chino", "zh:现代标准汉语"], "sa": ["en:Sanskrit", "es:Sánscrito"],
    "ja": ["en:Japanese"], "ar": ["it:Arabo", "tr:Arapça"], "ru": ["pt:Russo", "it:Russo", "zh:俄语"], "tr": ["tr:Türkçe", "es:Turco"],
}
# school material for native speakers ("@school") and university/linguistics courses ("@university"), and the
# Wikiversity courses ("wv-xx:"), shown under their own headers in Learn (Allan, 2026-10-20)
EXTRA_SOURCES = {
    "ja": ["ja:小学校国語@school", "ja:中学校国語@school", "ja:中学校国語 文法@school", "ja:中学校国語 古文@school", "ja:中学校国語 漢文@school",
           "ja:高等学校国語総合@school", "ja:高等学校古文@school", "ja:高等学校古典B@school", "wv-en:Beginner Japanese", "wv-en:Japanese Language", "wv-fr:Japonais"],
    "zh": ["zh:小学语文@school", "zh:初中语文@school", "zh:國中語文（高中）@school", "wv-fr:Chinois"],
    "fi": ["fi:Äidinkieli@school", "wv-en:Learning Finnish"], "tr": ["tr:Türkçe@school", "tr:Ön-Türkçe@university", "wv-en:Turkish"],
    "it": ["it:Italiano@school", "wv-en:Introduction to Italian", "wv-fr:Italien", "wv-es:Gramática básica del italiano"], "nl": ["nl:Nederlands@school", "wv-en:Dutch Language", "wv-fr:Néerlandais"],
    "uk": ["uk:Українська мова@school", "wv-en:Ukrainian language"], "fr": ["fr:Français@school", "wv-en:French", "wv-fr:Leçons de français par niveau"],
    "cs": ["wv-en:Czech Language"], "ru": ["ru:Некоторые сюжеты из истории русского языка@university", "ru:Русский язык как иностранный", "wv-fr:Russe", "wv-en:Russian", "wv-ru:Русский язык (1 класс)@school", "wv-ru:Русский язык (5 класс)@school", "wv-ru:Русский язык (6 класс)@school", "wv-ru:Русский язык (7 класс)@school"],
    "la": ["hu:Latin", "es:Gramática de uso de la lengua latina", "la:Lingua Latina in libris de Harrio Potter@reader",
           "wv-en:Latin I@university", "wv-en:Latin II@university", "wv-en:Latin III@university", "wv-fr:Latin@school", "wv-it:Introduzione alla grammatica latina (superiori)@school", "wv-it:Programma di grammatica latina per le superiori@school", "wv-de:Lateinische Grammatik"],
    "grc": ["wv-en:Introductory Ancient Greek Language@university", "wv-fr:Grec ancien@school", "wv-it:Programma di grammatica greca per le superiori@school"],
    "de": ["wv-en:German Language", "wv-en:German grammar", "wv-fr:Allemand", "wv-de:Kontrastive Syntax Deutsch-Englisch: Subjekte@university", "wv-de:Kontrastive Syntax Deutsch-Englisch: Passiv@university", "wv-de:Kontrastive Syntax Deutsch-Englisch: Verb und Objekte@university"], "es": ["wv-en:Spanish 1", "wv-fr:Espagnol"],
    "pt": ["wv-en:Brazilian Portuguese", "wv-en:Portuguese Language", "wv-fr:Portugais", "wv-pt:Portal:Grupo de Estudos em Português para o ensino fundamental@school", "wv-pt:Morfologia do Português@university"], "ar": ["wv-en:Arabic", "wv-fr:Arabe"],
    "ko": ["wv-en:Korean", "wv-en:Korean Language", "wv-fr:Coréen"], "pl": ["wv-en:Polish language", "wv-fr:Polonais"],
    "hu": ["wv-en:Hungarian language", "de:Ungarisch/Ungarisch-Lesebuch-Einfache-Texte-für-Kinder@reader",
           "de:Ungarisch/Ungarisch-Lesebuch-Dialoge@reader", "de:Ungarisch/Ungarisch-Lesebuch-Eiszeit@reader",
           "de:Ungarisch/Ungarisch-Lesebuch-Alltagthemen@reader"], "el": ["wv-en:Greek Language", "wv-el:Γλώσσα Α' Δημοτικού@school", "wv-el:Γλώσσα Β' Δημοτικού@school", "wv-el:Γλώσσα Ε' Δημοτικού@school", "wv-el:Γλώσσα ΣΤ' Δημοτικού@school"], "sa": ["wv-en:Sanskrit Language"],
}
# full grammars for the Reference tab (Wikisource: public domain; Wikibooks: CC BY-SA); "ws-xx:" = Wikisource
REFERENCE = {
    "sa": ["ws-en:Sanskrit Grammar (Whitney)"],
    "hu": ["ws-en:Simplified Grammar of the Hungarian Language", "hu:Magyar nyelvtan", "de:Ungarisch/Ungarisch-Grammatik"],
    "grc": ["ws-el:Τέχνη Γραμματική", "ws-en:Syntax of the Moods and Tenses of the Greek Verb"],
    "ar": ["ws-ar:المقدمة الآجرومية (1283 هـ)", "ws-ar:الآجرومية في قواعد علم العربية"], "ja": ["ws-ja:改撰標準日本文法"], "zh": ["ws-zh:國語文法概論"],
    "es": ["es:Español", "ws-es:Gramática de la lengua castellana (1771)"],
    "it": ["ws-en:Italian with Grammar", "it:Grammatica contestuale"], "pt": ["pt:Português", "pt:Introdução à língua portuguesa"],
    "nl": ["nl:Nederlands", "fr:Grammaire néerlandaise"], "pl": ["pl:Polski"], "el": ["de:Neugriechisch: Grammatik", "tr:Çağdaş Yunanca"],
    "en": ["en:English Grammar", "en:English in Use", "de:Englisch: Grammatik", "pt:Gramática inglesa estrutural", "hu:Angol nyelvtan", "ja:高校英語の文法"],
    "fi": ["hu:Finn nyelvtan"], "la": ["ws-la:Ars grammatica"],
}


# Project Gutenberg books: (number, the book's lesson/section heading pattern, course|reference, author and title, year)
GUTENBERG = {
    "fr": [("48011", r"[A-ZÈÉ][A-ZÈÉ -]+ LEÇON\.?\s*$|LEÇON SUPPLÉMENTAIRE", "course", "Albert A. Méras and B. Méras, <i>Le Premier Livre</i>", 1915)],
    "es": [("15127", r"LESSON [IVXLC]+\.?\s*$", "course", "C. A. Toledano, <i>Pitman's Commercial Spanish Grammar</i>", 1917),
           ("38124", r"LESSON [IVXLC]+\.?\s*$", "course", "Edith J. Broomhall, <i>Spanish Composition</i>", 1921)],
    "de": [("44642", r"§\. ?\d+\.", "reference", "Hermann Bohm, <i>Kleine deutsche Sprachlehre</i> (spelling of 1879)", 1879)],
    "pt": [("79190", r"[A-Z][A-Z ,]{4,}\.?$", "reference", "John Casper Branner, <i>A Brief Grammar of the Portuguese Language</i>", 1910)],
}


# open textbooks on Pressbooks: (vendor folder, title, licence, book url, Learn header group)
# open textbooks published as PDF (vendor/<path>, made with `pdftotext -layout`; tools/fetch_learn_sources.sh), cut at
# their own chapters: (path, chapter pattern, running heads to drop, where the chapters end, title, licence, url, group,
# levels)
PDF_BOOKS = {
    "grc": [("peek/peek.txt", r"Module \d+", [r"©.*CC BY", r"^[0-9ivx]+\s+Ancient Greek I$", r"^Module \d+ \|.*\d+$", r"^Contents\s+[ivx]+$"],
             r"Appendix I: .*", "Philip S. Peek, <i>Ancient Greek I: A 21st Century Approach</i> (Open Book Publishers, 2021)",
             "CC BY 4.0", "https://doi.org/10.11647/OBP.0264", "university", ["Beginner", "Intermediate"]),
            ("peek2/peek2.txt", r"Module \d+", [r"©.*Peek", r"^[0-9ivx]+\s+Ancient Greek II: A 21st-Century Approach$", r"^Module \d+ \|.*\d+$", r"^Contents\s+[ivx]+$"],
             r"Appendix I", "Philip S. Peek, <i>Ancient Greek II: A 21st-Century Approach</i> (Open Book Publishers, 2025)",
             "CC BY 4.0", "https://doi.org/10.11647/OBP.0441", "university", ["Intermediate", "Reading"])],
}
PRESSBOOKS = {
    "fr": [("pb-grammaire", "Kanstantsin Tsedryk, <i>Grammaire française : approche interactive et visuelle</i> (University of Waterloo)", "CC BY-SA 4.0",
            "https://ecampusontario.pressbooks.pub/grammaire/", "university")],
    "es": [("pb-aalh", "Julie Ann Ward (ed.), <i>Antología abierta de literatura hispana</i> (Rebus Community)", "CC BY 4.0",
            "https://press.rebus.community/aalh/", "reader", ["C1", "C2"])],
    "ru": [("pb-diverserussian", "<i>Diverse Russian: A Multicultural Exploration</i> (University of Wisconsin–Madison)", "CC BY-SA 4.0",
            "https://wisc.pb.unizin.org/diverserussian/", "university")],
}


def merge_reference_levels(index, lessons, prefer=None):
    """one Reference tab per language: the topics of every reference level go into one (Latin's A&G when there)"""
    refs = [lv for lv in index["levels"] if lv.get("reference")]
    if len(refs) < 2:
        return
    keep = next((lv for lv in refs if lv["id"] == prefer), refs[0])
    for lv in refs:
        if lv is keep:
            continue
        keep["topics"].extend(lv["topics"])
        for tp in lv["topics"]:
            for e in tp["lessons"]:
                if e["id"] in lessons:
                    lessons[e["id"]]["level"] = keep["id"]
        index["levels"].remove(lv)


def reference_level(index):
    """the language's Reference grammar tab (Latin's is Allen & Greenough, A&G), made on first use"""
    for lv in index["levels"]:
        if lv.get("reference"):
            return lv["id"]
    index["levels"].append({"id": "Reference", "reference": True, "topics": [],
                            "title": {"en": "Reference grammar", "pt": "Gramática de referência", "de": "Referenzgrammatik",
                                      "mk": "Референтна граматика", "ar": "مرجع النحو"}})
    return "Reference"


EXPAND = {"mk", "ar", "la", "grc", "de", "ru", "ko", "fi", "el", "sa", "cs", "pl", "tr", "hu", "is", "pt", "fr", "es", "en", "it", "nl", "uk", "lt", "he", "sh", "ro"}
CASE_LANGS = {"la", "grc", "de", "ru", "fi", "el", "sa", "cs", "pl", "tr", "hu", "is", "uk", "lt", "sh", "ro"}
T3 = {"mk": "mkd", "ar": "ara", "la": "lat", "grc": "grc", "de": "deu", "ru": "rus", "ko": "kor", "fi": "fin", "el": "ell", "sa": "san",
      "cs": "ces", "pl": "pol", "tr": "tur", "hu": "hun", "is": "isl", "pt": "por", "fr": "fra", "es": "spa", "en": "eng", "it": "ita", "nl": "nld", "uk": "ukr", "lt": "lit", "he": "heb", "sh": "srp", "ro": "ron"}


def sentences_of(code: str) -> list:
    """the language's Tatoeba sentences and its corpus texts (vendor/corpora/<code>)"""
    import bz2
    out = []
    f = ROOT / "vendor" / "tatoeba" / f"{T3.get(code, code)}_sentences.tsv.bz2"
    if f.exists():
        out += [line.rstrip("\n").split("\t")[2] for line in bz2.open(f, "rt", encoding="utf-8") if line.count("\t") >= 2]
    for t in sorted((ROOT / "vendor" / "corpora" / code).glob("*.txt")) if (ROOT / "vendor" / "corpora" / code).exists() else []:
        out += t.read_text(encoding="utf-8").splitlines()
    return out


def main(code: str) -> None:
    """data/<code>/learn.json (the index), learn/<lesson>.json (one lesson), learn/questions-<level>.json"""
    index, lessons, questions = builder(code)()
    if code == "pt" and (ROOT / "vendor" / "batepapo" / "chapters.txt").exists():
        from learn_pressbooks import pressbooks_lessons
        folder = ROOT / "vendor" / "batepapo"
        slugs = [u.rstrip("/").split("/")[-1] for u in (folder / "chapters.txt").read_text().split()]
        credit = {"en": "Bate-Papo, by Eduardo Viana da Silva (University of Washington), CC BY 4.0",
                  "pt": "Bate-Papo, de Eduardo Viana da Silva (Universidade de Washington), CC BY 4.0"}
        n = pressbooks_lessons(folder, slugs, "pt-bp", credit, "Bate-Papo: An Introduction to Portuguese (UW), CC BY 4.0",
                               lambda slug: f"https://uw.pressbooks.pub/batepapo/chapter/{slug}/", ["A1", "A2"], index, lessons, questions)
        print(f"pt: {n} lessons from Bate-Papo")
    if code == "hu" and (ROOT / "vendor" / "ginever" / "ginever.txt").exists():
        from learn_gutenberg import book_lessons
        t = (ROOT / "vendor" / "ginever" / "ginever.txt").read_text(encoding="utf-8")
        t = t[t.find("CHAPTER I\n\nTHE ALPHABET"):t.rfind("HUNGARIAN-ENGLISH VOCABULARY")]
        rules = {"accusative": {"seq": [{"pos": "noun", "case": "acc"}], "same": ["number"]},
                 "dative": {"seq": [{"pos": "noun", "case": "dat"}], "same": ["number"]},
                 "number": {"seq": [{"pos": "noun", "number": "pl", "case": "nom"}], "same": ["case"]},
                 "place, direction": {"seq": [{"pos": "noun", "case": ["ine", "ela", "ill", "sup", "del", "sub", "ade", "abl", "all"]}], "same": ["number"]},
                 "comparison of adjectives": {"seq": [{"pos": "adj", "re": "bb(ak|ek|at|et)?$"}], "same": ["number"]},
                 "iktelen": {"seq": [{"pos": "verb", "mood": "ind", "definite": "indef"}], "same": ["tense", "mood", "definite"]},
                 "ikes": {"seq": [{"pos": "verb", "re": "ik$"}], "same": ["tense", "mood"]},
                 "irregular verbs": {"seq": [{"lemma": "^(megy|jön|eszik|iszik|tesz|vesz|visz|hisz|alszik|lesz|van)$"}], "same": ["tense", "mood"]}}
        credit = {"en": "<p><small>From Joseph Ginever, <i>Hungarian Grammar</i> (1909), Project Gutenberg #76725, public domain.</small></p>",
                  "pt": "<p><small>De Joseph Ginever, <i>Hungarian Grammar</i> (1909), Project Gutenberg #76725, domínio público, em inglês.</small></p>"}
        levels = [lv["id"] for lv in index["levels"]]
        print(f"hu: {book_lessons(t, 'hu-ginever', credit, 'Ginever, Hungarian Grammar (1909), public domain', levels, index, lessons, questions, rules, {'en': 'Ginever: ', 'pt': 'Ginever: '})} sections from Ginever's Hungarian Grammar (1909)")
    WIKIBOOKS = {"ru": "Russian", "el": "Modern_Greek", "ar": "Arabic", "de": "German", "tr": "Turkish", "fr": "French", "es": "Spanish", "nl": "Dutch"}
    wb = ROOT / "vendor" / "wikibooks" / WIKIBOOKS.get(code, "-") / "pages.json"
    if wb.exists():
        from learn_wikibooks import wikibooks_lessons
        case = lambda c: {"seq": [{"pos": ["noun", "adj"], "case": c}], "same": ["number"]}   # noqa: E731
        # (the Wikibooks courses are beginner to intermediate: their pages go to A1–B1, never up to C2)
        rules = {"nominative": case("nom"), "genitive": case("gen"), "dative": case("dat"), "accusative": case("acc"),
                 "instrumental": case("ins"), "prepositional": case("pre"), "locative": case("loc"), "vocative": case("voc"),
                 "past tense": {"seq": [{"pos": "verb", "tense": "past"}], "same": ["person", "number"]},
                 "imperative": {"seq": [{"pos": "verb", "mood": "imp"}], "same": ["person", "number"]},
                 "plural": {"seq": [{"pos": "noun", "number": "pl"}], "same": ["case"]}} if code in CASE_LANGS else {}
        print(f"{code}: {wikibooks_lessons(code, WIKIBOOKS[code], json.loads(wb.read_text(encoding='utf-8')), index, lessons, questions, levels=[lv['id'] for lv in index['levels'] if lv['id'] in ('A1', 'A2', 'B1')] or None, rules=rules)} lessons from Wikibooks")
    # Wikibooks courses of this language in other editions (2026-10-20: every human-written open course found,
    # docs/PLAN-2026-10-20-HUMAN-SOURCES.md; vendor/wikibooks/…/pages.json, tools/fetch_wikibooks.py), then the
    # reference grammars: a "Reference grammar" tab for every language, as Latin has Allen & Greenough
    from learn_wikibooks import wikibooks_lessons
    for spec, reference in [(x, False) for x in FOREIGN_WIKIBOOKS.get(code, []) + EXTRA_SOURCES.get(code, [])] + [(x, True) for x in REFERENCE.get(code, [])]:
        spec, _, group = spec.partition("@")          # "fr:Latin@school": the kind of source, for the Learn headers
        edition, book = spec.split(":", 1)
        site = {"ws-": "wikisource", "wv-": "wikiversity"}.get(edition[:3], "wikibooks")
        edition = edition[3:] if site != "wikibooks" else edition
        folder = (ROOT / "vendor" / site / edition / book) if site != "wikibooks" else \
            ROOT / "vendor" / "wikibooks" / (book if edition == "en" else f"{edition}/{book}")
        if not (folder / "pages.json").exists():
            continue
        if reference:
            lvls = [reference_level(index)]
        else:
            lvls = [lv["id"] for lv in index["levels"] if lv["id"] in ("A1", "A2", "B1")] or None
        tag = {"wikisource": "ws", "wikiversity": "wv"}.get(site, "wb")
        n = wikibooks_lessons(code, book, json.loads((folder / "pages.json").read_text(encoding="utf-8")), index, lessons, questions,
                              levels=lvls, edition=edition, prefix=f"{code}-{tag}{edition}{zlib.crc32(book.encode()) % 1000:03d}", site=site, group=group or None)
        print(f"{code}: {n} lessons from {site} ({edition}) {book}{' → reference' if reference else ''}")
    # public-domain books from Project Gutenberg (vendor/gutenberg/<n>.txt, tools/fetch_learn_sources.sh), each cut at its
    # own lesson or section headings; a course goes to the first levels, a grammar to the Reference tab
    for n, heading, kind, author_title, year in GUTENBERG.get(code, []):
        f = ROOT / "vendor" / "gutenberg" / f"{n}.txt"
        if not f.exists():
            continue
        from learn_gutenberg import book_lessons
        t = f.read_text(encoding="utf-8")
        t = t[max(0, t.find("*** START")):t.find("*** END") if "*** END" in t else len(t)]
        lvls = [reference_level(index)] if kind == "reference" else \
            ([lv["id"] for lv in index["levels"] if lv["id"] in ("A1", "A2", "B1")] or [lv["id"] for lv in index["levels"]][:2])
        credit = {"en": f"<p><small>From {author_title} ({year}), Project Gutenberg #{n}, public domain.</small></p>",
                  "pt": f"<p><small>De {author_title} ({year}), Projeto Gutenberg #{n}, domínio público.</small></p>"}
        short = re.sub(r"<[^>]+>", "", author_title)
        k = book_lessons(t, f"{code}-pg{n}", credit, f"{short} ({year}), Project Gutenberg #{n}, public domain", lvls, index, lessons,
                         questions, None, {"en": f"{short.split(',')[0]}: ", "pt": f"{short.split(',')[0]}: "}, heading=heading, min_chars=300)
        print(f"{code}: {k} sections from {short} (Gutenberg #{n}){' → reference' if kind == 'reference' else ''}")
    for path, heading, drop, stop, title, licence, url, group, want in PDF_BOOKS.get(code, []):
        f = ROOT / "vendor" / path
        if not f.exists():
            continue
        from learn_gutenberg import book_lessons
        from learn_pdfbook import clean_layout
        t = clean_layout(f.read_text(encoding="utf-8"), heading, drop, stop)
        first = re.search(rf"^{heading}: ", t, re.M)
        t = t[[m.start() for m in re.finditer(rf"^{first.group(0)}", t, re.M)][-1]:] if first else t   # past the contents
        credit = {"en": f'<p><small>From <a href="{url}">{title}</a>, {licence}.</small></p>',
                  "pt": f'<p><small>De <a href="{url}">{title}</a>, {licence}.</small></p>'}
        lvls = [lv["id"] for lv in index["levels"] if lv["id"] in want] or [lv["id"] for lv in index["levels"] if lv["id"] != "Reference"][:2]
        short = re.sub(r"<[^>]+>", "", title)
        k = book_lessons(t, f"{code}-pdf{zlib.crc32(path.encode()) % 1000:03d}", credit, f"{short}, {licence}", lvls, index, lessons,
                         questions, None, None, heading=rf"{heading}(: .*)?$", min_chars=300, group=group)
        print(f"{code}: {k} chapters from {short}")
    # graded readers: Global Storybooks, CC BY stories only (vendor/global-asp, vendor/global-pb)
    story_dirs = [ROOT / "vendor" / repo / code for repo in ("global-asp", "global-pb") if (ROOT / "vendor" / repo / code).is_dir()]
    if story_dirs:
        from learn_storybooks import storybook_lessons
        print(f"{code}: {storybook_lessons(code, story_dirs, index, lessons, questions)} stories from Global Storybooks")
    # open university textbooks on Pressbooks (vendor/<folder>, tools/fetch_pressbooks.mjs)
    for folder_name, title, licence, url, group, *want in PRESSBOOKS.get(code, []):
        folder = ROOT / "vendor" / folder_name
        if not (folder / "chapters.txt").exists():
            continue
        from learn_pressbooks import pressbooks_lessons
        slugs = [u.rstrip("/").split("/")[-1] for u in (folder / "chapters.txt").read_text().split()]
        credit = {"en": f'<p><small>From <a href="{url}">{title}</a>, {licence}.</small></p>',
                  "pt": f'<p><small>De <a href="{url}">{title}</a>, {licence}.</small></p>'}
        lvls = [lv["id"] for lv in index["levels"] if lv["id"] in (want[0] if want else ("B1", "B2"))] or [lv["id"] for lv in index["levels"]][-2:]
        n = pressbooks_lessons(folder, slugs, f"{code}-{folder_name}", credit, f"{title}, {licence}",
                               lambda slug, u=url: f"{u}chapter/{slug}/", lvls, index, lessons, questions, group=group)
        print(f"{code}: {n} sections from {title} ({licence})")
    if code == "pl" and (ROOT / "vendor" / "pl-exam" / "du.txt").exists():
        from learn_pl_exam import pl_exam_lessons
        print(f"pl: {pl_exam_lessons(ROOT / 'vendor' / 'pl-exam' / 'du.txt', index, lessons, questions)} points of the official exam grammar list (Dz.U. 2025 poz. 217)")
    if code == "fi" and (ROOT / "vendor" / "eliot" / "eliot.txt").exists():
        from learn_gutenberg import book_lessons
        t = (ROOT / "vendor" / "eliot" / "eliot.txt").read_text(encoding="utf-8")
        t = t[t.find("A FINNISH GRAMMAR.\n"):t.find("SELECTIONS FROM FINNISH LITERATURE")]
        case = lambda *c: {"seq": [{"pos": ["noun", "adj"], "case": list(c)}], "same": ["number"]}   # noqa: E731
        rules = {"inessive": case("ine", "ela", "ill"), "adessive": case("ade", "abl", "all"), "partitive": case("par"),
                 "genitive": case("gen"), "essive": case("ess", "tra"), "accusative": case("gen", "par"),
                 "infinitive": {"seq": [{"pos": "verb", "re": "m(a|ä)(an|än|ssa|ssä|sta|stä|tta|ttä)$"}], "suffixes": ["maan", "massa", "masta", "matta"], "attested": True},
                 "participle": {"seq": [{"pos": "verb", "mood": "part"}], "same": ["number"]},
                 "potential": {"seq": [{"pos": "verb", "mood": "pot"}], "same": ["person", "number"]},
                 "conditional": {"seq": [{"pos": "verb", "mood": "cond"}], "same": ["person", "number"]},
                 "imperative": {"seq": [{"pos": "verb", "mood": "imp"}], "same": ["person", "number"]},
                 "negative": {"seq": [{"lemma": "^ei$"}, {"pos": "verb"}], "gap": 0, "same": ["tense", "mood"]}}
        credit = {"en": "<p><small>From C. N. E. Eliot, <i>A Finnish Grammar</i> (1890), Project Gutenberg #59795, public domain. Its spelling and some forms are of the 19th century.</small></p>",
                  "pt": "<p><small>De C. N. E. Eliot, <i>A Finnish Grammar</i> (1890), Project Gutenberg #59795, domínio público, em inglês. A grafia e algumas formas são do século XIX.</small></p>"}
        levels = [lv["id"] for lv in index["levels"]][1:]
        print(f"fi: {book_lessons(t, 'fi-eliot', credit, 'Eliot, A Finnish Grammar (1890), public domain', levels, index, lessons, questions, rules, {'en': 'Eliot: ', 'pt': 'Eliot: '}, subheads=True)} sections from Eliot's Finnish Grammar (1890)")
    if code == "la" and (ROOT / "vendor" / "ag" / "alphabet.html").exists():
        from learn_ag import ag_lessons
        print(f"la: {ag_lessons(ROOT / 'vendor' / 'ag', index, lessons, questions)} lessons from Allen and Greenough (DCC)")
    if code == "grc" and (ROOT / "vendor" / "agfe" / "html" / "toc.html").exists():
        agfe_grc(index, lessons, questions)
    if code == "sa" and (ROOT / "vendor" / "learnsanskrit" / "html").exists():
        from learn_lso import lso_lessons
        print(f"sa: {lso_lessons(ROOT / 'vendor' / 'learnsanskrit', index, lessons, questions)} lessons from the learnsanskrit.org guide")
    if code == "cs" and (ROOT / "vendor" / "nigrin" / "nigrin.txt").exists():
        from learn_nigrin import nigrin_lessons
        print(f"cs: {nigrin_lessons(ROOT / 'vendor' / 'nigrin' / 'nigrin.txt', index, lessons, questions)} lessons from Nigrin's Bohemian Grammar (1918)")
    if code == "ko" and (ROOT / "vendor" / "nikl" / "csv" / "문법.csv").exists():
        from learn_ko_nikl import nikl_lessons
        print(f"ko: {nikl_lessons(ROOT / 'vendor' / 'nikl' / 'csv' / '문법.csv', ROOT / 'vendor' / 'kodict' / 'grammar.json', index, lessons, questions)} lessons from the NIKL syllabus")
    if code in EXPAND:
        from learn_expand import expand
        n = expand(code, ROOT / "data" / code, index, lessons, questions, sentences_of(code), cases=code in CASE_LANGS)
        print(f"{code}: {n} generated lessons")
    merge_reference_levels(index, lessons, prefer="A&G")
    out = ROOT / "data" / code
    folder = out / "learn"
    if folder.exists():
        for f in folder.glob("*.json"):
            f.unlink()
    folder.mkdir(parents=True, exist_ok=True)
    # questions in one file per lesson (hundreds per lesson once the Tatoeba ones are added: tools/learn_examples.mjs)
    per_lesson = {lid: qs for lv in questions.values() for lid, qs in lv.items()}
    index["files"] = [f"learn/{lid}.json" for lid in lessons] + [f"learn/q-{lid}.json" for lid in per_lesson]
    dump = lambda obj: json.dumps(obj, ensure_ascii=False, separators=(",", ":"))   # noqa: E731
    (out / "learn.json").write_text(dump(index), encoding="utf-8")
    for lid, lesson in lessons.items():
        (folder / f"{lid}.json").write_text(dump(lesson), encoding="utf-8")
    for lid, qs in per_lesson.items():
        (folder / f"q-{lid}.json").write_text(dump(qs), encoding="utf-8")
    # imported pages machine-translated earlier (vendor/mt/cache.<ui>.json, tools/translate_learn.py) get their
    # translations back without the model
    import translate_learn
    for ui in ("en", "pt", "de", "mk", "ar"):
        if (ROOT / "vendor" / "mt" / f"cache.{ui}.json").exists():
            n = translate_learn.translate_language(code, translate_learn.CacheOnly(ui))
            if n:
                print(f"{code}: {n} pages from the {ui} translation cache")
    counts = {lv["id"]: sum(len(t["lessons"]) for t in lv["topics"] if t["kind"] == "grammar") for lv in index["levels"]}
    size = sum(f.stat().st_size for f in folder.glob("*.json")) // 1024
    print(f"{code}: grammar lessons {counts}, {len(lessons)} lesson files, {sum(len(v["qs"]) if isinstance(v, dict) else len(v) for qs in questions.values() for v in qs.values())} questions, {size} KB")


if __name__ == "__main__":
    main(sys.argv[1])
