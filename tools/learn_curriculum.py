"""Learn lessons written for Casus (Allan, 2026-10-19): for a language with no open graded course, the syllabus and
the explanations are written here, in English and Portuguese, in tools/curricula/<code>/ (meta.yml, then one file per
level) or one <code>.yml. A lesson: title, meaning, intro, a formation table, sections (usage, contrast, notes…),
common mistakes, examples, and a rule (tools/learn_match.mjs) that finds more examples in Tatoeba."""
from __future__ import annotations

import html
import re
from pathlib import Path

import markdown
import yaml

SECTION_TITLES = {
    "formation": {"en": "Formation", "pt": "Formação", "de": "Bildung", "mk": "Образување", "ar": "التكوين"},
    "usage": {"en": "How it is used", "pt": "Como se usa", "de": "Gebrauch", "mk": "Како се користи", "ar": "الاستعمال"},
    "contrast": {"en": "Compare", "pt": "Compare", "de": "Vergleiche", "mk": "Спореди", "ar": "قارن"},
    "notes": {"en": "Good to know", "pt": "Bom saber", "de": "Gut zu wissen", "mk": "Добро е да се знае", "ar": "من المفيد أن تعرف"},
    "examples": {"en": "Examples", "pt": "Exemplos", "de": "Beispiele", "mk": "Примери", "ar": "أمثلة"},
    "mistakes": {"en": "Common mistakes", "pt": "Erros comuns", "de": "Häufige Fehler", "mk": "Чести грешки", "ar": "أخطاء شائعة"},
}
LANGS = ("en", "pt")
EXTRA = ("de", "mk", "ar")      # interface languages a lesson may also have (tools/curricula/<code>/i18n/<ui>.yml)


def _md(text: str) -> str:
    return markdown.markdown(text or "", extensions=["tables"], output_format="html")


def _both(value) -> dict:
    """a text given once (the same in both languages) or per language; German, Macedonian and Arabic only when given"""
    if isinstance(value, dict):
        return {**{k: value.get(k) or value.get("en", "") for k in LANGS}, **{k: value[k] for k in EXTRA if value.get(k)}}
    return {k: value for k in LANGS}


def _langs(*values) -> tuple:
    """the interface languages any of these texts has"""
    return LANGS + tuple(k for k in EXTRA if any(isinstance(v, dict) and v.get(k) for v in values))


def _table(t: dict) -> dict:
    head = _both(t["head"])
    out = {}
    for k in head:
        cells = "".join(f"<th>{html.escape(h)}</th>" for h in head[k])
        rows = "".join("<tr>" + "".join(f"<td>{_inline(_both(c)[k] if isinstance(c, dict) else c)}</td>" for c in r) + "</tr>" for r in t["rows"])
        note = _both(t.get("note", "")).get(k) or _both(t.get("note", ""))["en"]
        out[k] = f"<table><thead><tr>{cells}</tr></thead><tbody>{rows}</tbody></table>" + (_md(note) if note else "")
    return out


def _inline(text) -> str:
    return re.sub(r"^<p>(.*)</p>$", r"\1", _md(str(text)).strip(), flags=re.S)


def _gap_furi(text: str, target: str) -> tuple[list, str] | None:
    """the sentence with the target blanked (any case: Не at the start is the target не), and the target as written"""
    m = re.search(rf"(?<![\w-]){re.escape(target)}(?![\w-])", text, flags=re.I)
    if not m:
        return None
    parts = [[text[: m.start()], None], ["＿＿", None], [text[m.end():], None]]
    return [p for p in parts if p[0]], m.group(0)


def _load(path: Path) -> dict:
    if path.is_dir():
        meta = yaml.safe_load((path / "meta.yml").read_text(encoding="utf-8"))
        meta["levels"] = [yaml.safe_load((path / f"{lv}.yml").read_text(encoding="utf-8"))
                          for lv in meta["level_files"] if (path / f"{lv}.yml").exists()]
        apply_overlays(path, meta["levels"])
        return meta
    return yaml.safe_load(path.read_text(encoding="utf-8"))


def apply_overlays(folder: Path, levels: list) -> None:
    """tools/curricula/<code>/i18n/<ui>.yml: a lesson's text in another interface language — {topics: {English
    title: title}, lessons: {id: {meaning, intro, sections: {id: body}, mistakes: [why…]}}} — written into the level
    data as one more language beside en and pt"""
    for ui in EXTRA:
        tops, mine = {}, {}
        # one file per interface language, or several (de.A1.yml, de.A2.yml…)
        for f in sorted((Path(folder) / "i18n").glob(f"{ui}.*yml")) if (Path(folder) / "i18n").exists() else []:
            over = yaml.safe_load(f.read_text(encoding="utf-8")) or {}
            tops.update(over.get("topics") or {})
            mine.update(over.get("lessons") or {})
        if not mine and not tops:
            continue
        for lv in levels:
            for topic in lv.get("topics", []):
                en = topic["title"].get("en") if isinstance(topic["title"], dict) else topic["title"]
                if en in tops:
                    topic["title"] = {**_both(topic["title"]), ui: tops[en]}
                for l in topic.get("lessons", []):
                    o = mine.get(l.get("id"))
                    if not o:
                        continue
                    for key in ("meaning", "intro"):
                        if o.get(key):
                            l[key] = {**_both(l.get(key, "")), ui: o[key]}
                    for s in l.get("sections", []):
                        if (o.get("sections") or {}).get(s["id"]):
                            s["body"] = {**_both(s["body"]), ui: o["sections"][s["id"]]}
                    for m, why in zip(l.get("mistakes", []), o.get("mistakes") or []):
                        m["why"] = {**_both(m["why"]), ui: why}


def lesson_page(src: dict, tables=None) -> dict:
    """tables: (data dir, attested word counts, final sigma) for `paradigms:` — tables made from the reader's own
    paradigm data (tools/learn_tables.py)"""
    sections = []
    if src.get("table"):
        sections.append({"id": "formation", "title": SECTION_TITLES["formation"], "html": _table(src["table"])})
    if src.get("paradigms") and tables:
        from learn_tables import paradigm_table
        data, attested, sigma, *rest = tables
        exclude = rest[0] if rest else None
        for k, spec in enumerate(src["paradigms"]):
            t = paradigm_table(data, spec, attested=attested, final_sigma=sigma, exclude=exclude)
            label = spec.get("label") or {"en": spec["word"], "pt": spec["word"]}
            sections.append({"id": f"paradigm-{k}", "title": _both(label), "html": _table(t)})
    for s in src.get("sections", []):
        body = _both(s["body"])
        sections.append({"id": s["id"], "title": _both(s.get("title") or SECTION_TITLES.get(s["id"], s["id"])),
                         "html": {k: _md(v) for k, v in body.items()}})
    examples = [{"text": e[0], "en": e[1], "pt": e[2], **({"target": e[3]} if len(e) > 3 and e[3] else {})}
                for e in src.get("examples", [])]
    langs = _langs(src.get("meaning"), src.get("intro"))
    if examples:
        # (an example's translation is English or Portuguese; the other interfaces show the English)
        sections.append({"id": "examples", "title": SECTION_TITLES["examples"], "html": {k: "".join(
            f'<div class="ex"><p class="ja" dir="auto">{html.escape(e["text"])}</p><p class="en">{html.escape(e.get(k) or e["en"])}</p></div>' for e in examples) for k in langs}})
    if src.get("mistakes"):
        sections.append({"id": "mistakes", "title": SECTION_TITLES["mistakes"], "html": {k: "<ul>" + "".join(
            f'<li>❌ <s>{html.escape(m["wrong"])}</s> → ✅ <b>{html.escape(m["right"])}</b><br>{_inline(_both(m["why"]).get(k) or _both(m["why"])["en"])}</li>'
            for m in src["mistakes"]) + "</ul>" for k in langs}})
    page = {"id": src["id"], "title": src["title"], "meaning": _both(src["meaning"]),
            "intro": {k: _md(v) for k, v in _both(src.get("intro", "")).items()}, "sections": sections,
            "examples": examples, "practice": [], "source": "written for Casus"}
    if src.get("match"):
        page["match"] = src["match"]
    if src.get("pool"):
        page["pool"] = src["pool"]
    for key in ("swaps", "prefixes", "suffixes"):
        if src.get(key):
            page[key] = src[key]
    return page


def _level(lv: dict, data: dict, tables=None) -> tuple[dict, dict, dict]:
    """one level file → (level entry for the index, its lesson pages, its questions)"""
    topics, qs, lessons = [], {}, {}
    for t_k, topic in enumerate(lv["topics"], 1):
        entries = []
        for src in topic["lessons"]:
            page = lesson_page(src, (*tables, data.get("exclude_forms")) if tables else None)
            page.update({"level": lv["id"], "topic": _both(topic["title"])})
            # lessons written by AI (Claude) for Casus are marked as such on the page and in the list (Allan,
            # 2026-10-20); a lesson can say otherwise (ai: false)
            ai = src.get("ai", bool(data.get("ai_written")))
            if ai:
                page["ai"] = True
            lessons[page["id"]] = page
            entries.append({"id": page["id"], "title": page["title"], "meaning": page["meaning"], **({"ai": True} if ai else {})})
            mine = []
            for e in page["examples"]:
                found = _gap_furi(e["text"], e["target"]) if e.get("target") else None
                if found:
                    mine.append({"type": "gap", "furi": found[0], "en": e["en"], "pt": e["pt"], "answer": found[1]})
                mine.append({"type": "translate", "furi": [[e["text"], None]], "answer": e["en"], "pt": e["pt"]})
            qs[page["id"]] = {"pools": {"gap": [x for x in src.get("pool", [])]}, "qs": mine}
        topics.append({"id": f"{lv['id']}-t{t_k}", "kind": "grammar", "title": _both(topic["title"]), "lessons": entries})
    level = {"id": lv["id"], **({"title": _both(lv["title"])} if lv.get("title") else {}), "topics": topics}
    return level, lessons, qs


def written_levels(folder: Path, ids: list, tables=None) -> tuple[list, dict, dict]:
    """levels written for Casus by AI (Claude) beside a course from another source (German: Grimm Grammar stops at
    B2, so C1 and C2 are written here): tools/curricula/<code>/<id>.yml, each lesson marked AI-written"""
    levels, lessons, questions = [], {}, {}
    raw = [yaml.safe_load((Path(folder) / f"{i}.yml").read_text(encoding="utf-8")) for i in ids if (Path(folder) / f"{i}.yml").exists()]
    apply_overlays(folder, raw)
    for lv in raw:
        level, mine, qs = _level(lv, {"ai_written": True}, tables)
        levels.append(level)
        lessons.update(mine)
        questions[level["id"]] = qs
    return levels, lessons, questions


def curriculum_learn(path: Path, tables=None) -> tuple[dict, dict, dict]:
    data = _load(path)
    levels, lessons, questions = [], {}, {}
    for lv in data["levels"]:
        level, mine, qs = _level(lv, data, tables)
        levels.append(level)
        lessons.update(mine)
        questions[lv["id"]] = qs
    if data.get("vocab"):
        add_vocabulary(data["vocab"], levels, lessons, path)
    index = {"system": data["system"], "levels": levels, "credit": _both(data["credit"])}
    # names never gapped (exact, or as stems for an inflecting language: Tom → Tomille), and features every wrong
    # answer keeps (Finnish: no possessive suffix the sentence doesn't have)
    for key in ("names", "name_stems", "exclude_forms", "whole_words", "strict_attested"):
        if data.get(key):
            index[key] = data[key]
    return index, lessons, questions


def add_vocabulary(spec: dict, levels: list, lessons: dict, path: Path) -> None:
    """graded words as Words lessons (word ↔ English questions in the page): spec = {file: tsv of word, part of speech,
    level, English; levels: {source level: [our level ids]} — a source level shared by several of ours is split
    evenly between them in order; unit: words a lesson}"""
    import math
    f = Path(spec["file"])
    if not f.is_absolute():
        f = Path(__file__).resolve().parents[1] / f
    if not f.exists():
        return
    rows = [line.split("\t") for line in f.read_text(encoding="utf-8").splitlines() if line.count("\t") >= 3]
    unit = spec.get("unit", 40)
    for src, ours in spec["levels"].items():
        words = [{"w": r[0], "en": r[3]} for r in rows if r[2] == src and r[3]]
        seen, uniq = set(), []
        for w in words:
            if w["w"] not in seen:
                seen.add(w["w"])
                uniq.append(w)
        per = math.ceil(len(uniq) / len(ours)) if ours else 0
        for k, lv_id in enumerate(ours):
            mine = uniq[k * per:(k + 1) * per]
            if not mine:
                continue
            level = next((lv for lv in levels if lv["id"] == lv_id), None)
            if level is None:
                continue
            n = math.ceil(len(mine) / unit)
            size = math.ceil(len(mine) / n)
            entries = []
            for j in range(n):
                part = mine[j * size:(j + 1) * size]
                lid = f"{lv_id.lower().replace(' ', '')}-v{j + 1}"
                lessons[lid] = {"id": lid, "kind": "vocab", "level": lv_id, "words": part, "source": spec.get("source", "")}
                entries.append({"id": lid, "title": " · ".join(w["w"] for w in part[:3]) + " …", "meaning": {"en": f"{len(part)} words", "pt": f"{len(part)} palavras"}})
            level["topics"].append({"id": f"{lv_id}-words", "kind": "vocab", "title": {"en": "Words", "pt": "Palavras"}, "lessons": entries})
