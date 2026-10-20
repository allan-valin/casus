"""Czech lessons from Charles Nigrin, *Bohemian Grammar* (1918; Project Gutenberg #50595, public domain in the USA;
vendor/nigrin/nigrin.txt): an elementary course in about sixty lessons, each with its grammar, a vocabulary, exercises
(translation both ways, oral drills) and a reading. Imported as written, the book's =word= marks shown in bold; the
lesson's own vocabulary becomes its rule for Tatoeba's sentences, so its exercises use those words in real Czech.
The book's spelling is that of 1918 (jest for je, "Bohemian" for Czech): the page says so."""
from __future__ import annotations

import html
import re

ROMAN = {"I": 1, "V": 5, "X": 10, "L": 50, "C": 100}
HEAD = re.compile(r"^(?:LESSON\s+)?([IVXLC]+)\.(?:\s+ÚLOHA\s+[IVXLC]+\.)?\s*$")


def roman(s: str) -> int:
    n = 0
    for a, b in zip(s, s[1:] + " "):
        n += -ROMAN[a] if ROMAN.get(b, 0) > ROMAN[a] else ROMAN[a]
    return n


def lessons_of(text: str) -> list[dict]:
    """the lessons in order; a heading that does not continue the numbering (a table numbered I. inside a lesson) is
    part of the lesson"""
    lines = text.splitlines()
    heads = []
    for k, line in enumerate(lines):
        m = HEAD.match(line.strip())
        if m:
            n = roman(m.group(1))
            if heads and n != heads[-1][1] + 1:
                continue
            heads.append((k, n))
    # the first lesson (the alphabet) has no heading: it starts at "The Bohemian Alphabet" and ends at Lesson II
    if heads and heads[0][1] == 2:
        start = next((k for k, line in enumerate(lines[: heads[0][0]]) if line.startswith("The Bohemian Alphabet")), None)
        if start is not None:
            heads.insert(0, (start - 1, 1))
            lines[start - 1] = ""
    out = []
    for i, (k, n) in enumerate(heads):
        end = heads[i + 1][0] if i + 1 < len(heads) else len(lines)
        body = lines[k + 1:end]
        while body and not body[0].strip():
            body.pop(0)
        title_line = body.pop(0).strip() if body else ""
        title = re.sub(r"\.?--", " — ", title_line).rstrip(".").strip()
        text_ = "\n".join(body).strip()
        text_ = re.split(r"\n\s*PART [IVX]+\.--DÍL [IVX]+\.", text_)[0].strip()
        out.append({"n": n, "title": title or f"Lesson {n}", "text": text_})
    return out


def vocabulary(text: str) -> list[tuple[str, str]]:
    """the =word=, gloss pairs of the lesson's word lists (indented lines; two columns are common)"""
    out = []
    for line in text.splitlines():
        if not line.startswith(" "):
            continue
        for w, g in re.findall(r"=([^=]+)=(?:\s*\([^)]*\))?,\s*([^,;=]+)[,;]?", line):
            if (w.strip(), g.strip()) not in out:
                out.append((w.strip(), g.strip()))
    return out


def to_html(text: str) -> str:
    parts = []
    for block in re.split(r"\n\s*\n", text.strip()):
        b = html.escape(block.strip("\n"))
        b = re.sub(r"=([^=\n]+)=", r"<b>\1</b>", b)
        if re.fullmatch(r"(Exercise [IVXL]+\.|Vocabulary\.|Translate into \w+:)", block.strip()):
            parts.append(f"<h4>{b.strip()}</h4>")
        elif block.startswith("  "):
            parts.append("<p class=\"list\">" + "<br>".join(x.strip() for x in b.splitlines()) + "</p>")
        else:
            parts.append(f"<p>{' '.join(b.split())}</p>")
    return "\n".join(parts)


def nigrin_lessons(path, index: dict, lessons: dict, questions: dict) -> int:
    """the course spread over the first levels (a third each to A1, A2, B1)"""
    course = lessons_of(open(path, encoding="utf-8").read())
    levels = [lv["id"] for lv in index["levels"]][:3]
    topics = {lv["id"]: lv["topics"] for lv in index["levels"]}
    per = {}
    for k, l in enumerate(course):
        lv = levels[min(len(levels) - 1, k * len(levels) // len(course))]
        lid = f"cs-nigrin-{l['n']}"
        vocab = vocabulary(l["text"])
        words = [w for w, _ in vocab if " " not in w]
        note = {"en": "<p><small>From Charles Nigrin, <i>Bohemian Grammar</i> (1918), public domain. Its spelling is that of 1918 (<b>jest</b> for today's <b>je</b>); \"Bohemian\" means Czech.</small></p>",
                "pt": "<p><small>De Charles Nigrin, <i>Bohemian Grammar</i> (1918), domínio público, com explicações em inglês. A grafia é a de 1918 (<b>jest</b> para o atual <b>je</b>); \"Bohemian\" quer dizer tcheco.</small></p>"}
        body = to_html(l["text"])
        page = {"id": lid, "title": f"{l['n']}. {l['title']}", "meaning": {"en": l["title"], "pt": l["title"]},
                "intro": note, "sections": [{"id": "book", "title": {"en": "The lesson", "pt": "A lição"}, "html": {"en": body, "pt": body}}],
                "examples": [], "practice": [], "level": lv, "topic": {"en": "Nigrin's course (1918)", "pt": "Curso de Nigrin (1918)"},
                "source": "Charles Nigrin, Bohemian Grammar (1918), Project Gutenberg #50595, public domain"}
        if words:
            page["match"] = {"seq": [{"word": words}], "gap": 0}
            page["pool"] = words[:12]
        lessons[lid] = page
        questions.setdefault(lv, {})[lid] = {"pools": {"gap": page.get("pool", [])}, "qs": []}
        per.setdefault(lv, []).append({"id": lid, "title": page["title"], "meaning": page["meaning"]})
    for lv, entries in per.items():
        topics[lv].append({"id": f"{lv}-nigrin", "kind": "grammar", "title": {"en": "Nigrin's course (1918)", "pt": "Curso de Nigrin (1918)"}, "lessons": entries})
    return len(course)
