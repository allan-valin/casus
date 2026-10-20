"""Korean lessons from the official grammar list of the International Standard Curriculum for Korean (국제 통용 한국어
표준 교육과정 적용 연구 4단계, National Institute of Korean Language 2017, list revised 2020-11-17; KOGL type 1,
attribution: korean.go.kr report 932): 336 particles, endings and expressions in six levels, the same six as TOPIK.
Each point is a lesson with its forms, the NIKL Basic Korean Dictionary's definitions and examples (한국어기초사전,
CC BY-SA 2.0 KR; vendor/kodict/grammar.json, tools/build_kodict_grammar.py) and a rule for Tatoeba's sentences: a
particle by its forms, an ending by the end of the verb (an ending that starts with a final consonant, -ㄹ래요, by the
syllables that have it), an expression by its words in order."""
from __future__ import annotations

import csv
import html
import json
import re
from pathlib import Path

KIND = {"조사": "particles", "연결어미": "endings", "종결어미": "endings", "전성어미": "endings", "선어말어미": "endings", "표현": "expressions"}
TOPIC = {"particles": ("Official syllabus: particles", "Programa oficial: partículas"),
         "endings": ("Official syllabus: endings", "Programa oficial: terminações"),
         "expressions": ("Official syllabus: expressions", "Programa oficial: expressões")}
KIND_NAME = {"조사": ("particle", "partícula"), "연결어미": ("connective ending", "terminação conectiva"), "종결어미": ("final ending", "terminação final"),
             "전성어미": ("transformative ending", "terminação de transformação"), "선어말어미": ("pre-final ending", "terminação pré-final"), "표현": ("expression", "expressão")}
def js_escape(s: str) -> str:
    """escape for a JavaScript unicode regex (Python's re.escape writes \\- and the like, which `u` mode rejects)"""
    return re.sub(r"([.*+?^${}()|\[\]\\/])", r"\\\1", s)


JAMO_FINAL = {"ㄱ": 1, "ㄴ": 4, "ㄹ": 8, "ㅁ": 16, "ㅂ": 17, "ㅅ": 19, "ㅆ": 20, "ㅇ": 21}


def forms_of(main: str, related: str) -> list[str]:
    out = []
    for f in [main, *re.split(r"\s*,\s*", related or "")]:
        if not f or f.startswith("<") or "<" in f:
            continue
        f = re.sub(r"(?<=[가-힣ㄱ-ㅎ])\d+", "", f.strip()).strip("-").strip()
        f = re.sub(r"\(.*?\)", "", f).strip()
        if f and f not in out:
            out.append(f)
    return out


def final_class(jamo: str) -> str:
    """every Hangul syllable whose final consonant is `jamo` (갈, 할… for ㄹ), as a regex character class body"""
    k = JAMO_FINAL[jamo]
    return "".join(chr(0xAC00 + i) for i in range(11172) if i % 28 == k)


def _ending_re(form: str) -> str:
    """an ending as a pattern for the end of a word; one that starts with a bare final consonant (ㄹ래요) as the
    syllables that end in it, followed by the rest"""
    if form and form[0] in JAMO_FINAL:
        return f"[{final_class(form[0])}]{js_escape(form[1:])}"
    return js_escape(form)


def _rule(kind: str, forms: list[str]) -> dict | None:
    if kind == "조사":
        return {"seq": [{"word": forms}], "gap": 0}
    if kind == "표현":
        parts = forms[0].split()
        if len(parts) == 1:
            return {"seq": [{"pos": ["verb", "adj"], "re": f"({'|'.join(_ending_re(f) for f in forms if ' ' not in f)})"}]}
        seq = []
        first = [f.split()[0] for f in forms if f.split()]
        if forms[0][0] in "을ㄹ는은ㄴ고기어아지게도" or KIND.get(kind) == "expressions" and not re.match(r"^[이에을를가]", parts[0]):
            seq.append({"pos": ["verb", "adj"], "re": f"({'|'.join(dict.fromkeys(_ending_re(f) for f in first))})$"})
        else:
            seq.append({"word": list(dict.fromkeys(first))})
        for p in parts[1:]:
            seq.append({"re": "^" + js_escape(p[:-1] if p.endswith("다") and len(p) > 1 else p)})
        return {"seq": seq, "gap": 0, "near": 0}
    # an ending (connective, final, transformative, pre-final)
    plain = [f for f in forms if " " not in f]
    if not plain:
        return None
    pattern = "|".join(_ending_re(f) for f in plain)
    anchor = "" if kind == "선어말어미" else "$"
    rule = {"seq": [{"pos": ["verb", "adj"], "re": f"({pattern}){anchor}"}]}
    if anchor and all(f[0] not in JAMO_FINAL for f in plain):
        rule["suffixes"] = plain
        rule["attested"] = True
    return rule


def nikl_lessons(list_csv: Path, kodict_json: Path, index: dict, lessons: dict, questions: dict) -> int:
    dic = json.loads(Path(kodict_json).read_text(encoding="utf-8")) if Path(kodict_json).exists() else {}
    rows = list(csv.DictReader(open(list_csv, encoding="utf-8")))
    topics = {lv["id"]: lv["topics"] for lv in index["levels"]}
    by_level = {}
    # endings of one level offer each other's endings as wrong answers (attested in the sentences)
    level_endings = {}
    for r in rows:
        if r["분류"] in ("연결어미", "종결어미"):
            level_endings.setdefault(r["등급"], []).extend(f for f in forms_of(r["대표형"], r["관련형"]) if " " not in f and f[0] not in JAMO_FINAL)
    n = 0
    for r in rows:
        kind = r["분류"]
        forms = forms_of(r["대표형"], r["관련형"])
        rule = _rule(kind, forms) if forms else None
        if not rule:
            continue
        if "suffixes" in rule:
            rule["suffixes"] = list(dict.fromkeys(rule["suffixes"] + level_endings.get(r["등급"], [])))[:12]
        lv = f"TOPIK {r['등급'].rstrip('급')}"
        lid = f"ko-nikl-{r['전체 번호']}"
        key = ("-" if kind != "조사" else "") + forms[0]
        entries = dic.get(key) or dic.get(re.sub(r"\d+$", "", r["대표형"])) or []
        senses = [s for e in entries for s in e.get("senses", [])][:3]
        name_en, name_pt = KIND_NAME[kind]
        shown = ", ".join(("" if kind == "조사" else "-") + f for f in forms)
        meaning_ko = r.get("의미", "").strip()
        first_def = next((s.get("en_def") for s in senses if s.get("en_def")), "")

        def block(lang):
            parts = [f"<p><b>{html.escape(shown)}</b> — {name_en if lang == 'en' else name_pt}"
                     + (f" ({html.escape(meaning_ko)})" if meaning_ko else "") + ".</p>"]
            for k, s in enumerate(senses, 1):
                ex = "".join(f"<div class=\"ex\"><p class=\"ja\">{html.escape(x)}</p></div>" for x in s.get("examples", [])[:2])
                parts.append(f"<p><b>{k}.</b> {html.escape(s.get('en_def') or '')}<br><small>{html.escape(s.get('ko') or '')}</small></p>{ex}")
            if not senses:
                parts.append("<p>" + ("The sentences below use it; then the exercises." if lang == "en" else "As frases abaixo o usam; depois, os exercícios.") + "</p>")
            return "".join(parts)

        page = {"id": lid, "title": r["대표형"].lstrip("-") if kind == "조사" else re.sub(r"\d+$", "", r["대표형"]),
                "meaning": {"en": first_def or f"{name_en}{' — ' + meaning_ko if meaning_ko else ''}", "pt": first_def or f"{name_pt}{' — ' + meaning_ko if meaning_ko else ''}"},
                # with English definitions the Portuguese comes from tools/translate_learn.py, not a copy
                "intro": {"en": block("en"), **({} if senses else {"pt": block("pt")})}, "sections": [], "examples": [], "practice": [], "level": lv,
                "topic": {"en": TOPIC[KIND[kind]][0], "pt": TOPIC[KIND[kind]][1]}, "match": rule,
                "source": "NIKL International Standard Curriculum grammar list (KOGL type 1); definitions and examples: 한국어기초사전 (NIKL, CC BY-SA 2.0 KR)"}
        if kind == "조사":
            page["pool"] = []
        lessons[lid] = page
        questions.setdefault(lv, {})[lid] = {"pools": {"gap": []}, "qs": []}
        by_level.setdefault(lv, {}).setdefault(KIND[kind], []).append({"id": lid, "title": page["title"], "meaning": page["meaning"]})
        n += 1
    # particles of a level are each other's wrong answers
    for lv, groups in by_level.items():
        parts = [lessons[e["id"]]["match"]["seq"][0]["word"][0] for e in groups.get("particles", [])]
        for e in groups.get("particles", []):
            own = lessons[e["id"]]["match"]["seq"][0]["word"]
            lessons[e["id"]]["pool"] = [own[0], *[p for p in parts if p not in own]][:10]
            questions[lv][e["id"]]["pools"]["gap"] = lessons[e["id"]]["pool"]
        for kind in ("particles", "endings", "expressions"):
            if groups.get(kind) and lv in topics:
                topics[lv].append({"id": f"{lv}-nikl-{kind}", "kind": "grammar", "title": {"en": TOPIC[kind][0], "pt": TOPIC[kind][1]}, "lessons": groups[kind]})
    return n
