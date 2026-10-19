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
    "formation": {"en": "Formation", "pt": "Formação"}, "usage": {"en": "How it is used", "pt": "Como se usa"},
    "contrast": {"en": "Compare", "pt": "Compare"}, "notes": {"en": "Good to know", "pt": "Bom saber"},
    "examples": {"en": "Examples", "pt": "Exemplos"}, "mistakes": {"en": "Common mistakes", "pt": "Erros comuns"},
}
LANGS = ("en", "pt")


def _md(text: str) -> str:
    return markdown.markdown(text or "", extensions=["tables"], output_format="html")


def _both(value) -> dict:
    """a text given once (the same in both languages) or per language"""
    if isinstance(value, dict):
        return {k: value.get(k) or value.get("en", "") for k in LANGS}
    return {k: value for k in LANGS}


def _table(t: dict) -> dict:
    head = _both(t["head"])
    out = {}
    for k in LANGS:
        cells = "".join(f"<th>{html.escape(h)}</th>" for h in head[k])
        rows = "".join("<tr>" + "".join(f"<td>{_inline(c)}</td>" for c in r) + "</tr>" for r in t["rows"])
        note = _both(t.get("note", ""))[k]
        out[k] = f"<table><thead><tr>{cells}</tr></thead><tbody>{rows}</tbody></table>" + (_md(note) if note else "")
    return out


def _inline(text) -> str:
    return re.sub(r"^<p>(.*)</p>$", r"\1", _md(str(text)).strip(), flags=re.S)


def _gap_furi(text: str, target: str) -> list | None:
    m = re.search(rf"(?<![\w-]){re.escape(target)}(?![\w-])", text)
    if not m:
        return None
    parts = [[text[: m.start()], None], ["＿＿", None], [text[m.end():], None]]
    return [p for p in parts if p[0]]


def _load(path: Path) -> dict:
    if path.is_dir():
        meta = yaml.safe_load((path / "meta.yml").read_text(encoding="utf-8"))
        meta["levels"] = [yaml.safe_load((path / f"{lv}.yml").read_text(encoding="utf-8"))
                          for lv in meta["level_files"] if (path / f"{lv}.yml").exists()]
        return meta
    return yaml.safe_load(path.read_text(encoding="utf-8"))


def lesson_page(src: dict) -> dict:
    sections = []
    if src.get("table"):
        sections.append({"id": "formation", "title": SECTION_TITLES["formation"], "html": _table(src["table"])})
    for s in src.get("sections", []):
        body = _both(s["body"])
        sections.append({"id": s["id"], "title": _both(s.get("title") or SECTION_TITLES.get(s["id"], s["id"])),
                         "html": {k: _md(body[k]) for k in LANGS}})
    examples = [{"text": e[0], "en": e[1], "pt": e[2], **({"target": e[3]} if len(e) > 3 and e[3] else {})}
                for e in src.get("examples", [])]
    if examples:
        sections.append({"id": "examples", "title": SECTION_TITLES["examples"], "html": {k: "".join(
            f'<div class="ex"><p class="ja">{html.escape(e["text"])}</p><p class="en">{html.escape(e[k])}</p></div>' for e in examples) for k in LANGS}})
    if src.get("mistakes"):
        sections.append({"id": "mistakes", "title": SECTION_TITLES["mistakes"], "html": {k: "<ul>" + "".join(
            f'<li>❌ <s>{html.escape(m["wrong"])}</s> → ✅ <b>{html.escape(m["right"])}</b><br>{_inline(_both(m["why"])[k])}</li>'
            for m in src["mistakes"]) + "</ul>" for k in LANGS}})
    page = {"id": src["id"], "title": src["title"], "meaning": _both(src["meaning"]),
            "intro": {k: _md(v) for k, v in _both(src.get("intro", "")).items()}, "sections": sections,
            "examples": examples, "practice": [], "source": "written for Casus"}
    if src.get("match"):
        page["match"] = src["match"]
    if src.get("pool"):
        page["pool"] = src["pool"]
    if src.get("swaps"):
        page["swaps"] = src["swaps"]
    return page


def curriculum_learn(path: Path) -> tuple[dict, dict, dict]:
    data = _load(path)
    levels, lessons, questions = [], {}, {}
    for lv in data["levels"]:
        topics, qs = [], {}
        for t_k, topic in enumerate(lv["topics"], 1):
            entries = []
            for src in topic["lessons"]:
                page = lesson_page(src)
                page.update({"level": lv["id"], "topic": _both(topic["title"])})
                lessons[page["id"]] = page
                entries.append({"id": page["id"], "title": page["title"], "meaning": page["meaning"]})
                mine = []
                for e in page["examples"]:
                    gap = _gap_furi(e["text"], e["target"]) if e.get("target") else None
                    if gap:
                        mine.append({"type": "gap", "furi": gap, "en": e["en"], "pt": e["pt"], "answer": e["target"]})
                    mine.append({"type": "translate", "furi": [[e["text"], None]], "answer": e["en"], "pt": e["pt"]})
                qs[page["id"]] = {"pools": {"gap": [x for x in src.get("pool", [])]}, "qs": mine}
            topics.append({"id": f"{lv['id']}-t{t_k}", "kind": "grammar", "title": _both(topic["title"]), "lessons": entries})
        levels.append({"id": lv["id"], "topics": topics})
        questions[lv["id"]] = qs
    return {"system": data["system"], "levels": levels, "credit": _both(data["credit"])}, lessons, questions
