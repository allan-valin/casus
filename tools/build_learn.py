#!/usr/bin/env python3
"""The Learn tab's lessons (Allan, 2026-10-19; design 2026-10-19-learn-and-three-sites-design.md §2):
data/<code>/learn.json — levels, each with units of lessons, each lesson with what the page needs to teach and to
ask about it. Japanese from OpenJLPT (CC BY-SA 4.0: grammar points written by its contributors, vocabulary and kanji
levels from Jonathan Waller, CC BY), vendored in vendor/openjlpt/.

Usage: python3 tools/build_learn.py ja"""
from __future__ import annotations

import csv
import json
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
EXPAND = {"mk", "ar", "la", "grc", "de", "ru", "ko", "fi", "el", "sa", "cs", "pl", "tr", "hu", "is", "pt", "fr", "es", "en"}
CASE_LANGS = {"la", "grc", "de", "ru", "fi", "el", "sa", "cs", "pl", "tr", "hu", "is"}
T3 = {"mk": "mkd", "ar": "ara", "la": "lat", "grc": "grc", "de": "deu", "ru": "rus", "ko": "kor", "fi": "fin", "el": "ell", "sa": "san",
      "cs": "ces", "pl": "pol", "tr": "tur", "hu": "hun", "is": "isl", "pt": "por", "fr": "fra", "es": "spa", "en": "eng"}


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
    WIKIBOOKS = {"ru": "Russian", "el": "Modern_Greek", "ar": "Arabic", "de": "German", "tr": "Turkish", "fr": "French", "es": "Spanish"}
    wb = ROOT / "vendor" / "wikibooks" / WIKIBOOKS.get(code, "-") / "pages.json"
    if wb.exists():
        from learn_wikibooks import wikibooks_lessons
        case = lambda c: {"seq": [{"pos": ["noun", "adj"], "case": c}], "same": ["number"]}   # noqa: E731
        rules = {"nominative": case("nom"), "genitive": case("gen"), "dative": case("dat"), "accusative": case("acc"),
                 "instrumental": case("ins"), "prepositional": case("pre"), "locative": case("loc"), "vocative": case("voc"),
                 "past tense": {"seq": [{"pos": "verb", "tense": "past"}], "same": ["person", "number"]},
                 "imperative": {"seq": [{"pos": "verb", "mood": "imp"}], "same": ["person", "number"]},
                 "plural": {"seq": [{"pos": "noun", "number": "pl"}], "same": ["case"]}} if code in CASE_LANGS else {}
        print(f"{code}: {wikibooks_lessons(code, WIKIBOOKS[code], json.loads(wb.read_text(encoding='utf-8')), index, lessons, questions, rules=rules)} lessons from Wikibooks")
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
    counts = {lv["id"]: sum(len(t["lessons"]) for t in lv["topics"] if t["kind"] == "grammar") for lv in index["levels"]}
    size = sum(f.stat().st_size for f in folder.glob("*.json")) // 1024
    print(f"{code}: grammar lessons {counts}, {len(lessons)} lesson files, {sum(len(v["qs"]) if isinstance(v, dict) else len(v) for qs in questions.values() for v in qs.values())} questions, {size} KB")


if __name__ == "__main__":
    main(sys.argv[1])
