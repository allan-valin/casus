"""Latin lessons for the Learn tab from Benjamin L. D'Ooge, *Latin for Beginners* (Ginn, 1909; public domain; Project
Gutenberg #18251, vendored in vendor/dooge/): 79 graded lessons, each with its explanation and paradigm tables, its
vocabulary (in the lesson or in the book's special vocabularies) and its exercises — Latin sentences to translate,
English sentences to put into Latin, questions to answer in Latin. Allan, 2026-10-19: real lessons, researched."""
from __future__ import annotations

import html as H
import re

SMALL = {"a", "an", "and", "as", "at", "by", "for", "from", "in", "of", "on", "or", "the", "to", "with", "without"}


def title_case(s: str) -> str:
    words = s.lower().split()
    out = []
    for k, w in enumerate(words):
        parts = w.split("-")
        out.append("-".join(p if (k and p in SMALL) else p[:1].upper() + p[1:] for p in parts))
    return " ".join(out).replace("( continued )", "(continued)")


def text_of(fragment: str) -> str:
    t = H.unescape(re.sub(r"\s+", " ", re.sub(r"<[^>]+>", "", fragment))).strip()
    return re.sub(r"(?<=[^\W\d_])\d+\b", "", t)                      # footnote numbers glued to a word (Erant1)


def clean(fragment: str) -> str:
    """the book's HTML for the page: page anchors and pictures out, links to other sections kept as text"""
    f = re.sub(r'<a name="[^"]*">\s*</a>', "", fragment)
    f = re.sub(r"<a\s+name\s*=\s*\"[^\"]*\"\s*>(.*?)</a>", r"\1", f, flags=re.S)
    f = re.sub(r"<a\s+href\s*=\s*\"[^\"]*\"\s*>(.*?)</a>", r"\1", f, flags=re.S)
    f = re.sub(r'<p class="illustration">.*?</p>', "", f, flags=re.S)
    f = re.sub(r"<p>\s*What Latin words are suggested by this picture\?\s*</p>", "", f)
    f = re.sub(r"<img[^>]*>", "", f)
    f = re.sub(r'<span class\s*=\s*"tag">\d+</span>', "", f)
    f = re.sub(r'\sclass\s*=\s*"[^"]*"', "", f)
    return re.sub(r"\n{2,}", "\n", f).strip()


def _sentences(block: str) -> list[str]:
    """'I. 1. Agricola … habitat. 2. Bona …' → the numbered sentences"""
    t = text_of(re.sub(r'<span class\s*=\s*"tag">\d+</span>', "", block))
    t = re.sub(r"^[IVX]+\.\s*", "", t)
    return [s.strip() for s in re.split(r"(?:^|\s)\d+\.\s", " " + t) if s.strip()]


def vocab_of(fragment: str) -> list[list[str]]:
    """[latin, english] from the book's vocabulary lists (<li> in a lesson, <div class="index"> in the appendix)"""
    out = []
    for item in re.findall(r"<li>(.*?)</li>|<div class=\"index special\">(.*?)</div>", fragment, flags=re.S):
        raw = item[0] or item[1]
        latin = text_of(raw.split(",")[0]).replace("´", "").replace("-", "")
        en = re.search(r"<i>(.*?)</i>", raw, flags=re.S)
        if latin and en and re.match(r"^[A-Za-zĀ-ūā-ū]+$", latin):
            out.append([latin, text_of(en.group(1)).split(",")[0].strip()])
    return out


def parse_lesson(fragment: str, appendix_vocab: str = "") -> dict:
    number = re.search(r'name="lesson_([IVXL]+)"', fragment).group(1)
    h = re.search(r"<h6[^>]*>(.*?)</h6>", fragment, flags=re.S)
    title = title_case(text_of(h.group(1))) if h else f"Lesson {number}"
    body = fragment[h.end():] if h else fragment
    # the EXERCISE(S) heading: a section paragraph holding nothing but its number and the word (never across paragraphs)
    split = re.search(r'<p(?: class="section")?>(?:(?!</p>).)*?<span class="midfat">EXERCISES?</span></p>', body, flags=re.S)
    lesson, rest = (body[: split.start()], body[split.end():]) if split else (body, "")
    latin, english, questions = [], [], []
    for para in re.findall(r"<p>\s*(?:<a[^>]*>\s*</a>\s*)?((?:I|II|III)\.\s.*?)</p>", rest, flags=re.S):
        kind = para.split(".")[0]
        sentences = _sentences(para)
        (english if kind == "II" else latin).extend(sentences)
    # questions to answer in Latin: an inset paragraph, or a plain one of numbered lines (1. Ubi …?<br />)
    blocks = re.findall(r'<p class="inset">(.*?)</p>', rest, flags=re.S) + [b for b in re.findall(r"<p>\s*(1\.\s.*?)</p>", rest, flags=re.S) if "<br" in b]
    for inset in blocks:
        questions.extend(re.sub(r"^\d+\.\s*", "", text_of(x)) for x in inset.split("<br />") if text_of(x))
    ol = lambda xs: "<ol>" + "".join(f"<li>{H.escape(x)}</li>" for x in xs) + "</ol>"   # noqa: E731
    exercises = ""
    if latin:
        exercises += "<h5>Latin → English</h5>" + ol(latin)
    if english:
        exercises += "<h5>English → Latin</h5>" + ol(english)
    if questions:
        exercises += "<h5>Answer in Latin</h5>" + ol(questions)
    # for gap exercises only real sentences: a list of forms (Vocāmus, properātis, iubent.) gives no clue to its gap
    # and not the book's English (a reading's heading) or its lists of alternatives ("laudāris or laudāre")
    english = lambda x: len(re.findall(r"\b(the|his|her|and|of|to|or|with|is)\b", x, flags=re.I)) >= 1   # noqa: E731
    sentence = lambda x: any(len(chunk.split()) > 2 for chunk in re.split(r"[,;:]", x)) and not english(x)   # noqa: E731
    return {"number": number, "title": title, "html": clean(lesson), "exercises_html": exercises,
            "drill": [x for x in latin + questions if sentence(x)], "vocab": vocab_of(lesson) + vocab_of(appendix_vocab)}


def appendix_vocabularies(book: str) -> dict[str, str]:
    """the special vocabularies at the back, by lesson number"""
    out = {}
    for m in re.finditer(r'<h5 class="subchap">LESSON ([IVXL]+),.*?</h5>(.*?)(?=<h5|<h4|<h3)', book, flags=re.S):
        out[m.group(1)] = out.get(m.group(1), "") + m.group(2)
    return out


def lessons_of(book: str) -> list[dict]:
    parts = re.split(r'(?=<h5 class="chapter">(?:<a name="page\d+">\s*</a>)?<a name="lesson_[IVXL]+">)', book)
    vocab = appendix_vocabularies(book)
    out = []
    for p in parts[1:]:
        p = re.split(r"<h3", p)[0]                       # the last lesson ends where Part III's reading or an appendix starts
        num = re.search(r'name="lesson_([IVXL]+)"', p).group(1)
        out.append(parse_lesson(p, vocab.get(num, "")))
    return out
