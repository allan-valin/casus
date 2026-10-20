"""Polish: the official grammar lists of the state exams in Polish as a foreign language, A1–C2 (annex 1 to the
regulation of 14 February 2025, Dz.U. 2025 poz. 217; vendor/pl-exam/du.txt = pdftotext -layout of
https://eli.gov.pl/eli/DU/2025/217/ogl/pol/pdf). A normative act is not covered by copyright (Polish Copyright Act
art. 4 pkt 1). The adults' part is used (it goes up to C2); each numbered point of "Fleksja" and "Składnia" becomes a
lesson in its level, its outline and example sentences as the ministry wrote them, in Polish."""
from __future__ import annotations

import html
import re

LEVEL = re.compile(r"OPIS KOMPETENCJI W JĘZYKU POLSKIM JAKO OBCYM NA POZIOMIE .*?– ([ABC][12])")
LEVEL_C1 = re.compile(r"NA POZIOMIE EFEKTYWNEJ BIEGŁOŚCI")
FURNITURE = re.compile(r"^\s*(– \d+ –|Dziennik Ustaw.*Poz\. \d+|﻿)\s*$")
MARK = [(re.compile(r"^\d+\)\s*"), 0), (re.compile(r"^[a-z]\)\s*"), 1), (re.compile(r"^–\s*"), 2), (re.compile(r"^•\s*"), 3)]


def blocks_of(text: str, adults: bool = True) -> list[dict]:
    """[{level, part, title, lines}] — one per numbered point of each level's grammar list (2.2), in order"""
    lines = text.splitlines()
    if adults:   # the second set of levels (A1–C2) is for adults; the first (A1–B2) for young learners
        starts = [i for i, l in enumerate(lines) if "A1" in l and LEVEL.search(l)]
        if len(starts) > 1:
            lines = lines[starts[1]:]
    out, level, part, inside, current = [], None, None, False, None
    for raw in lines:
        st = raw.strip().lstrip("﻿")
        if FURNITURE.match(raw) or not st:
            continue
        m = LEVEL.search(st)
        if m or LEVEL_C1.search(st):
            level, inside, current = (m.group(1) if m else "C1"), False, None
            continue
        if re.match(r"2\.2\.\s+Lista zagadnień gramatycznych", st):
            inside = True
            continue
        if re.match(r"2\.[3-9]\.", st) or re.match(r"[A-Z]\.\s+[A-ZĄĆĘŁŃÓŚŹŻ ]{8,}", st) or re.match(r"\d\.\s+[A-ZĄĆĘŁŃÓŚŹŻ]{4,}", st):
            inside, current = False, None
            continue
        if not inside:
            continue
        p = re.match(r"2\.2\.\d+\.\s*(.+?):?$", st)
        if p:
            part = p.group(1).strip().rstrip(":")
            continue
        n = re.match(r"^\d+\)\s*(.+?)[:;,.]?$", st)
        if n:
            current = {"level": level, "part": part, "title": n.group(1).strip().rstrip(":"), "lines": []}
            out.append(current)
            continue
        if current is not None:
            current["lines"].append(st)
    return out


def outline_html(lines: list) -> str:
    """the point's outline as nested lists; a line without a marker continues the item before it"""
    items = []
    for st in lines:
        for pat, depth in MARK:
            if pat.match(st):
                items.append([depth, pat.sub("", st)])
                break
        else:
            if items:
                items[-1][1] += " " + st
            else:
                items.append([1, st])
    out, depth = [], -1
    for d, text in items:
        while depth < d:
            out.append("<ul>"); depth += 1
        while depth > d:
            out.append("</ul>"); depth -= 1
        t = re.sub(r"\s+", " ", text).replace(" ,", ",").rstrip(",;")
        t = re.sub(r",\s*$", "", t)
        out.append(f"<li>{html.escape(t)}</li>")
    out.extend("</ul>" for _ in range(depth + 1))
    return "".join(out)


def pl_exam_lessons(path, index: dict, lessons: dict, questions: dict) -> int:
    blocks = blocks_of(path.read_text(encoding="utf-8"))
    topics = {lv["id"]: lv["topics"] for lv in index["levels"]}
    url = "https://eli.gov.pl/eli/DU/2025/217/ogl/pol/pdf"
    credit = {"en": f'<p><small>From the official grammar list of the Polish state exams for foreigners (<a href="{url}">Dz.U. 2025 poz. 217</a>, annex 1), in Polish. A normative act, not covered by copyright.</small></p>',
              "pt": f'<p><small>Da lista oficial de gramática dos exames estatais de polonês para estrangeiros (<a href="{url}">Dz.U. 2025 poz. 217</a>, anexo 1), em polonês. Ato normativo, fora do direito autoral.</small></p>'}
    per = {}
    for k, b in enumerate(blocks):
        if b["level"] not in topics:
            continue
        lid = f"pl-exam-{b['level']}-{k + 1}"
        body = outline_html(b["lines"])
        meaning = f"{b['part']}: {b['title']}"
        lessons[lid] = {"id": lid, "title": b["title"], "meaning": {"en": meaning, "pt": meaning}, "intro": credit,
                        "sections": [{"id": "list", "title": {"en": "The official list", "pt": "A lista oficial"}, "html": {"en": body, "pt": body}}],
                        "examples": [], "practice": [], "level": b["level"], "topic": {"en": "Exam grammar list", "pt": "Lista do exame"},
                        "source": "Dz.U. 2025 poz. 217, annex 1 (normative act, no copyright)"}
        questions.setdefault(b["level"], {})[lid] = {"pools": {"gap": []}, "qs": []}
        per.setdefault(b["level"], []).append({"id": lid, "title": b["title"], "meaning": lessons[lid]["meaning"]})
    for lv, entries in per.items():
        topics[lv].insert(0, {"id": f"{lv}-pl-exam", "kind": "grammar", "title": {"en": "The official exam grammar list (Dz.U. 2025)", "pt": "A lista oficial de gramática do exame (Dz.U. 2025)"}, "lessons": entries})
    return sum(len(v) for v in per.values())
