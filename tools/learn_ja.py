"""Japanese lessons for the Learn tab from JLPT Grammar Enhanced (github.com/maitodesu/jlpt-grammar-enhanced,
CC BY-SA 4.0; vendored in vendor/jlpt-grammar-enhanced/): 847 grammar points N5–N1, each with its explanation,
formation, examples with furigana, nuance, contrasts, common mistakes and five practice questions with explained
answers. Allan, 2026-10-19: real lessons, organised like Bento's grammar reference, furigana everywhere."""
from __future__ import annotations

import html
import re

import markdown

FURI = re.compile(r"\{f\|([^|}]+)\|([^}]+)\}")
SECTION_IDS = {"formation": "formation", "examples": "examples", "nuance & register": "nuance", "contrast": "contrast",
               "common mistakes": "mistakes", "usage": "usage", "practice": "practice"}


def furi_segments(text: str) -> list[list]:
    """[[text, reading or None]…] from {f|漢字|かな} markup; other tags dropped, plain runs split where tags were"""
    out = []
    for piece in re.split(r"(\{f\|[^}]+\})|<[^>]+>", text):
        if not piece:
            continue
        m = FURI.fullmatch(piece)
        if m:
            out.append([m.group(1), m.group(2)])
        else:
            out.append([html.unescape(piece), None])
    return out


def kana_of(text: str) -> str:
    return html.unescape(re.sub(r"<[^>]+>", "", FURI.sub(lambda m: m.group(2), text)))


def plain_of(text: str) -> str:
    return html.unescape(re.sub(r"<[^>]+>", "", FURI.sub(lambda m: m.group(1), text)))


def ruby(text: str) -> str:
    return FURI.sub(lambda m: f"<ruby>{m.group(1)}<rt>{m.group(2)}</rt></ruby>", text)


def _example(block: str) -> dict | None:
    lines = [l for l in block.strip().split("\n") if l.strip()]
    if len(lines) < 2:
        return None
    ja, en = lines[0].strip(), " ".join(l.strip() for l in lines[1:])
    target = re.search(r"<b>(.*?)</b>", ja)
    return {"furi": furi_segments(ja), "en": html.unescape(re.sub(r"<[^>]+>", "", en)),
            "target": plain_of(target.group(1)) if target else None, "kana": kana_of(ja), "text": plain_of(ja)}


def _html(md_text: str) -> str:
    # an example block becomes a card: the sentence with furigana, then its translation
    def card(m):
        ex = _example(m.group(1))
        if not ex:
            return m.group(0)
        lines = [l for l in m.group(1).strip().split("\n") if l.strip()]
        return f'<div class="ex"><p class="ja">{ruby(lines[0].strip())}</p><p class="en">{" ".join(l.strip() for l in lines[1:])}</p></div>'
    md_text = re.sub(r"<pre>\n?(.*?)</pre>", card, md_text, flags=re.S)
    return markdown.markdown(ruby(md_text), extensions=["tables"], output_format="html")


def parse_page(source: str) -> dict:
    title = re.search(r"^# (.+)$", source, re.M).group(1).strip()
    meaning = re.search(r"^\*\*Meaning\*\*\s*·\s*(.+)$", source, re.M)
    parts = re.split(r"^## (.+)$", source, flags=re.M)
    head, rest = parts[0], parts[1:]
    intro = re.sub(r"^# .+$|^\*\*Meaning\*\*.*$", "", head, flags=re.M).strip()
    lesson = {"title": title, "meaning": re.sub(r"[*`]", "", meaning.group(1)).strip() if meaning else "", "intro": _html(intro) if intro else "",
              "sections": [], "examples": [], "practice": []}
    for name, body in zip(rest[0::2], rest[1::2]):
        sid = SECTION_IDS.get(name.strip().lower(), re.sub(r"\W+", "-", name.strip().lower()))
        if sid == "practice":
            for q, a in re.findall(r"\*\*\d+\.\*\*\s*(.*?)\n+<details><summary>Answer</summary>\s*(.*?)</details>", body, flags=re.S):
                lesson["practice"].append({"q": _html(q.strip()), "a": _html(a.strip())})
            continue
        if sid == "examples":
            for block in re.findall(r"<pre>\n?(.*?)</pre>", body, flags=re.S):
                ex = _example(block)
                if ex:
                    lesson["examples"].append(ex)
        lesson["sections"].append({"id": sid, "title": name.strip(), "html": _html(body.strip())})
    return lesson


def summary(source: str) -> list[dict]:
    """the book's teaching order: [{level, topics: [{title, pages: [path]}]}]"""
    levels = []
    for line in source.splitlines():
        m = re.match(r"^# (N\d)", line)
        if m:
            levels.append({"level": m.group(1), "topics": []})
            continue
        t = re.match(r"^  - \[(.+?)\]\(\)\s*$", line)
        if t and levels:
            levels[-1]["topics"].append({"title": t.group(1), "pages": []})
            continue
        p = re.match(r"^    - \[(.+?)\]\(\./(n\d/[^)]+)\)", line)
        if p and levels and levels[-1]["topics"]:
            levels[-1]["topics"][-1]["pages"].append(p.group(2))
    return levels
