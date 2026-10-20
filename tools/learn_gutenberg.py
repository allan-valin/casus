"""Lessons from a public-domain grammar on Project Gutenberg (plain text): one lesson per section, split at its
CHAPTER headings and its capitalised section headings; an exercise stays with the section before it, footnotes are
left out; the book's _italic_ and =bold= marks become HTML, indented tables stay aligned. A section whose heading
names a grammatical point gets the rule the language's `rules` give for it (by keyword), so it has exercises from
Tatoeba. Used for Ginever's Hungarian Grammar (1909) and Eliot's Finnish Grammar (1890)."""
from __future__ import annotations

import html
import re

HEADING = re.compile(r"[A-ZÁÉÍÓÖŐÚÜŰÄ][A-ZÁÉÍÓÖŐÚÜŰÄ ,.;:()'\-—]{3,}\.?")


def _title(s: str) -> str:
    s = s.strip().rstrip(".").strip()
    return s[:1] + s[1:].lower() if s.isupper() else s


SUBHEAD = re.compile(r"_([A-Z][^_]{2,60})\._")


def sections_of(text: str, subheads: bool = False, heading: str | None = None, min_chars: int = 0) -> list[dict]:
    """subheads: a line that is only an italic heading (_Declension._) starts a section of the current chapter.
    heading: the book's own section pattern (PREMIÈRE LEÇON, LESSON IV.): only lines matching it start sections, a
    contents line (ending in a page number) does not, and what comes before the first one is left out; sections are
    grouped ten to a topic. min_chars: shorter sections (title pages, blank plates) are dropped."""
    if heading:
        pat, out, current = re.compile(heading), [], None
        for line in text.splitlines():
            st = line.strip()
            if pat.match(st) and not re.search(r"\s{2,}\d+$", st):   # a contents line: a page number set apart
                title = re.sub(r"\b([ivxlc]+)\b$", lambda m: m.group(1).upper(), _title(st.rstrip(".")))
                current = {"title": title, "text": ""}
                out.append(current)
            elif current is not None:
                current["text"] += line + "\n"
        out = [x for x in out if len(x["text"].strip()) >= min_chars and x["title"].lower() not in ("contents", "index", "table des matières", "inhalt")]
        for k, x in enumerate(out):
            label = lambda t: t.split(": ")[0]   # noqa: E731  ("Module 11: The Definite Article" → "Module 11")
            x["chapter"] = f"{label(out[k // 10 * 10]['title'])} – {label(out[min(len(out) - 1, k // 10 * 10 + 9)]['title'])}"
        return out
    lines = text.splitlines()
    out, chapter, current, skip = [], None, None, False
    for i, line in enumerate(lines):
        st = line.strip()
        if re.fullmatch(r"CHAPTER [IVXLC]+\.?", st):
            nxt = next((x.strip() for x in lines[i + 1:i + 4] if x.strip()), "")
            chapter = _title(nxt)
            current = None
            skip = True          # the chapter title line itself starts the first section
            continue
        if subheads and SUBHEAD.fullmatch(st) and current is not None and len(SUBHEAD.fullmatch(st).group(1)) > 5 \
                and SUBHEAD.fullmatch(st).group(1).lower() not in ("singular", "plural", "example", "examples", "exceptions"):
            current = {"chapter": current["chapter"], "title": SUBHEAD.fullmatch(st).group(1), "text": ""}
            out.append(current)
            continue
        if HEADING.fullmatch(st) and not st.startswith("NOTE"):
            if st.upper().startswith("FOOTNOTES"):
                current, skip = None, False
                out.append(None)
                continue
            if re.match(r"EXERCISE [IVXLC]+", st) and current is not None:
                current["text"] += f"\n\nExercise {st.split()[1].rstrip('.')}\n"
                skip = False
                continue
            current = {"chapter": chapter or _title(st), "title": _title(st), "text": ""}
            if subheads and not chapter:
                current["chapter"] = _title(st)
            out.append(current)
            skip = False
            continue
        if current is not None and not skip:
            current["text"] += line + "\n"
        elif skip and st == "":
            continue
    return [s for s in out if s and s["text"].strip()]


def to_html(text: str) -> str:
    parts = []
    for block in re.split(r"\n\s*\n", text.strip("\n")):
        if not block.strip():
            continue
        b = html.escape(block.rstrip())
        b = re.sub(r"=([^=\n]+)=", r"<b>\1</b>", b)
        b = re.sub(r"_([^_\n]+)_", r"<i>\1</i>", b)
        if re.fullmatch(r"Exercise [IVXLC]+", block.strip()):
            parts.append(f"<h4>{b.strip()}</h4>")
        elif block.startswith("  "):
            parts.append(f"<pre>{b}</pre>")
        else:
            parts.append(f"<p>{' '.join(b.split())}</p>")
    return "\n".join(parts)


def book_lessons(text: str, prefix: str, credit: dict, source: str, levels: list, index: dict, lessons: dict, questions: dict,
                 rules: dict | None = None, topic_title: dict | None = None, subheads: bool = False, heading: str | None = None,
                 min_chars: int = 0, group: str | None = None) -> int:
    """sections spread over `levels` in order, one topic per chapter; group: the Learn list section its topics go under
    (school, university, reader; none = a course for learners)"""
    secs = sections_of(text, subheads, heading, min_chars)
    topics = {lv["id"]: lv["topics"] for lv in index["levels"]}
    per = {}
    for k, s in enumerate(secs):
        lv = levels[min(len(levels) - 1, k * len(levels) // max(1, len(secs)))]
        lid = f"{prefix}-{k + 1}"
        body = to_html(s["text"])
        page = {"id": lid, "title": s["title"], "meaning": {"en": s["chapter"], "pt": s["chapter"]}, "intro": credit,
                "sections": [{"id": "book", "title": {"en": "The lesson", "pt": "A lição"}, "html": {"en": body, "pt": body}}],
                "examples": [], "practice": [], "level": lv, "topic": {"en": s["chapter"], "pt": s["chapter"]}, "source": source}
        key = f"{s['chapter']} {s['title']}".lower()
        rule = next((r for word, r in (rules or {}).items() if word in key), None)
        if rule:
            page["match"] = rule
        lessons[lid] = page
        questions.setdefault(lv, {})[lid] = {"pools": {"gap": []}, "qs": []}
        per.setdefault((lv, s["chapter"]), []).append({"id": lid, "title": s["title"], "meaning": page["meaning"]})
    for (lv, chapter), entries in per.items():
        title = {"en": f"{(topic_title or {}).get('en', '')}{chapter}", "pt": f"{(topic_title or {}).get('pt', '')}{chapter}"}
        topics[lv].append({"id": f"{lv}-{prefix}-{chapter}", "kind": "grammar", "title": title, "lessons": entries, **({"group": group} if group else {})})
    return len(secs)
