"""Open textbooks published as PDF (CC BY), read through `pdftotext -layout`: running heads, page numbers and
footers are dropped, each page loses the indentation the layout gave the whole page (so only tables and quoted
lines stay indented and become <pre> in learn_gutenberg.to_html), and a chapter heading ("Module 11") is joined
with the title lines under it, so learn_gutenberg.book_lessons can cut the book at its own chapters.
Used for Peek, Ancient Greek I (Open Book Publishers, 2021)."""
from __future__ import annotations

import re


def clean_layout(text: str, heading: str, drop: list[str], stop: str | None = None) -> str:
    """heading: the chapter pattern; drop: running heads and footers (searched in each stripped line); stop: the heading
    (a pattern for the whole line) where the chapters end, e.g. the first appendix; its last occurrence counts"""
    drops = [re.compile(d) for d in drop]
    head = re.compile(rf"^{heading}$")
    pages = []
    for page in text.replace("\x08", "").split("\f"):
        lines = [ln.rstrip() for ln in page.split("\n") if not any(d.search(ln.strip()) for d in drops)]
        indent = min((len(ln) - len(ln.lstrip()) for ln in lines if ln.strip()), default=0)
        pages.append([ln[indent:] for ln in lines])
    lines = [ln for page in pages for ln in page]
    if stop:   # the last line that is the stop heading (the contents may list it too) ends the chapters
        ends = [k for k, ln in enumerate(lines) if re.fullmatch(stop, ln.strip())]
        lines = lines[:ends[-1]] if ends else lines
    out, i = [], 0
    while i < len(lines):
        st = lines[i].strip()
        if head.match(st):
            title, j = [], i + 1
            while j < len(lines) and lines[j].strip():
                title.append(lines[j].strip())
                j += 1
            out.append(f"{st}: {' '.join(title)}" if title else st)
            i = j
            continue
        out.append(lines[i])
        i += 1
    # a table printed double-spaced: the blank lines between its indented rows go, so it stays one <pre> block
    ind = lambda s: s.startswith("   ") and s.strip()   # noqa: E731
    out = [ln for k, ln in enumerate(out) if ln.strip() or not (0 < k < len(out) - 1 and ind(out[k - 1]) and ind(out[k + 1]))]
    return "\n".join(out) + "\n"
