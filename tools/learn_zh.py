"""Chinese lessons for the Learn tab from the HSK 3.0 grammar syllabus (GF 0025-2021; the official list of 573 grammar
points for HSK 1–9, as extracted in github.com/ivankra/hsk30, MIT; vendor/hsk30/). Each point is a lesson in its level
and group. A point that lists forms (程度副词: 非常、很、太、真、最) shows each with its pinyin, its English
(CC-CEDICT, CC BY-SA) and a Tatoeba sentence, and its exercises choose among those forms; a frame (还是……吧) is matched
as a sequence; structural points (了, 把, 被, complements…) carry explanations and rules written for Casus
(tools/curricula/zh/notes.yml). Words by level from the same project's HSK 3.0 word list. Allan, 2026-10-20."""
from __future__ import annotations

import csv
import gzip
import html
import math
import re
from pathlib import Path

from learn_zh_labels import CATEGORIES, DETAILS, GROUPS

HAN = re.compile(r"^[㐀-鿿]+$")
LEVELS = ["1", "2", "3", "4", "5", "6", "7-9"]


def level_id(lv: str) -> str:
    return "HSK 7–9" if lv == "7-9" else f"HSK {lv}"


def forms_of(text: str) -> list[str]:
    """the forms a syllabus entry lists: after a 'kind：' label, split on 、；，/ and spaces, sense numbers dropped
    (every line of the entry: some list their kinds one per line)"""
    out = []
    for line in text.split("\n"):
        line = re.sub(r"^.*[：:]", "", line)
        line = re.sub(r"[（(][0-9０-９一二三四五六七八九十]+[)）]", " ", line)
        for item in re.split(r"[、；;，,/\s]+", line):
            item = re.sub(r"[0-9０-９①-⑩]+", "", re.sub(r"[（(].*?[)）]", "", item)).strip()
            # (names of grammar categories — 陈述句, 趋向补语, 数量短语 — are labels, not forms to drill)
            if item and HAN.match(item) and len(item) <= 4 and item not in out and not re.search(r"(句|语|词|式|短语)$", item):
                out.append(item)
    return out


DESCRIPTIVE = re.compile(r"作(主|谓|宾|定|状|补)语|短语|表示|句$|复句|类型|用法|语义")


def frame_of(text: str) -> list[list[str]] | None:
    """a frame with …… (还是……吧, 越……越……): its fixed parts, each with its alternatives (the first line that has one)"""
    line = next((x for x in (text or "").split("\n") if "……" in x), None)
    if line is None:
        return None
    line = re.sub(r"^.*[：:]", "", line)
    parts = []
    for part in line.split("……"):
        alts = [a for a in (re.sub(r"[^㐀-鿿]", "", x) for x in part.split("/")) if a]
        if alts:
            parts.append(alts)
    return parts if len(parts) >= 2 else None


def reading_key(pinyin: str) -> str:
    """a comparable key for a reading, from tone marks (fēicháng) or CEDICT numbers (fei1 chang2): its letters, then
    its non-neutral tones in order (de and de5 → "de|", tài and tai4 → "tai|4")"""
    marks = {"āáǎà": "a", "ēéěè": "e", "īíǐì": "i", "ōóǒò": "o", "ūúǔù": "u", "ǖǘǚǜ": "v"}
    letters, tones = [], []
    for ch in pinyin.lower().replace("ü", "v").replace("u:", "v"):
        for group, base in marks.items():
            if ch in group:
                tones.append(str(group.index(ch) + 1))
                ch = base
        if ch.isalpha():
            letters.append(ch)
        elif ch in "1234":
            tones.append(ch)
    return "".join(letters) + "|" + "".join(tones)


def cedict(path: Path) -> dict:
    """simplified → [(reading key, English: its first three senses)] (CC-CEDICT); variant and
    'used in' senses left out"""
    out = {}
    with gzip.open(path, "rt", encoding="utf-8") as f:
        for line in f:
            m = re.match(r"^(\S+) (\S+) \[([^\]]+)\] /(.+)/$", line.rstrip("\n"))
            if not m:
                continue
            senses = [x for x in m.group(4).split("/") if not re.match(r"(variant of|used in|surname|old variant|see )", x)]
            # pieces of the senses, long notes left out unless nothing else; a capitalised reading is a name
            pieces = [p for x in senses for p in x.split("; ")]
            short = [p for p in pieces if len(p) <= 50] or pieces
            if short:
                out.setdefault(m.group(2), []).append((reading_key(m.group(3)), "; ".join(short[:3]), m.group(3)[:1].isupper()))
    return out


def gloss_of(entries: list, pinyin: str = "") -> str:
    """the entry whose reading is the word's (得 de → the particle), else the first"""
    want = reading_key(pinyin) if pinyin else ""
    ranked = sorted(entries, key=lambda e: e[2])   # common words before names
    return next((e for r, e, _ in ranked if want and r == want), ranked[0][1] if ranked else "")


def zh_learn(grammar_csv: Path, words_csv: Path, cedict_path: Path, notes: dict, sentences=()) -> tuple[dict, dict, dict]:
    """sentences: (Chinese, English, Portuguese) to show one example per form, shortest first"""
    entries = cedict(cedict_path)
    pinyin = {}
    vocab = {lv: [] for lv in LEVELS}
    with open(words_csv, encoding="utf-8") as f:
        for r in csv.DictReader(f):
            pinyin.setdefault(r["Simplified"], r["Pinyin"])
            lv = r["Level"] if r["Level"] in vocab else ("7-9" if r["Level"].startswith("7") else None)
            g = gloss_of(entries.get(r["Simplified"], []), r["Pinyin"])
            if lv and g:
                vocab[lv].append({"w": r["Simplified"], "reading": r["Pinyin"], "en": g})
    gloss = {w: gloss_of(e, pinyin.get(w, "")) for w, e in entries.items()}
    examples = sorted(sentences, key=lambda s: len(s[0]))
    example_for = {}

    def example(word):
        if word not in example_for:
            example_for[word] = next((s for s in examples if word in s[0]), None)
        return example_for[word]

    rows = list(csv.DictReader(open(grammar_csv, encoding="utf-8")))
    levels, lessons, questions = {}, {}, {}
    for r in rows:
        lv = level_id(r["Level"])
        group = r["Group"]
        label = r["Details"] or r["Category"]
        note = notes.get(r["Details"]) or notes.get(r["Category"])
        title_text = r["Content"] or r["Details"] or r["Category"]
        frame = frame_of(r["Category"]) or frame_of(r["Details"]) or frame_of(r["Content"])
        # forms from the content; from the details only when they are a list, not a description (名词…作宾语)
        forms = [] if frame else (forms_of(r["Content"]) if r["Content"] else ([] if DESCRIPTIVE.search(r["Details"] or "") else forms_of(r["Details"])))
        cat = CATEGORIES.get(r["Category"])
        det = DETAILS.get(r["Details"])
        meaning = {"en": (det or cat or ("fixed frame" if group == "固定格式" else "spoken pattern" if group == "口语格式" else GROUPS.get(group, ("", ""))[0], ""))[0],
                   "pt": (det or cat or ("", "estrutura fixa" if group == "固定格式" else "padrão da fala" if group == "口语格式" else GROUPS.get(group, ("", ""))[1]))[1]}
        lid = f"zh-{r['No']}"
        sections = []
        if forms:
            def row(w):
                ex = example(w)
                ex_html = f"{html.escape(ex[0])}<br><small>{html.escape(ex[1])}</small>" if ex else ""
                return f"<tr><td><b>{w}</b></td><td>{pinyin.get(w, '')}</td><td>{html.escape(gloss.get(w, ''))}</td><td>{ex_html}</td></tr>"
            table = "<table><thead><tr><th>{}</th><th>pinyin</th><th>{}</th><th>{}</th></tr></thead><tbody>{}</tbody></table>"
            body = "".join(row(w) for w in forms)
            sections.append({"id": "forms", "title": {"en": "The forms", "pt": "As formas"},
                             "html": {"en": table.format("Form", "English", "Example", body), "pt": table.format("Forma", "Inglês", "Exemplo", body)}})
        page = {"id": lid, "title": title_text.split("\n")[0][:40] if title_text else label, "meaning": meaning,
                "intro": {k: f"<p>{html.escape(note[k]).replace(chr(10), '<br>')}</p>" if note else "" for k in ("en", "pt")} if note else "",
                "sections": sections, "examples": [], "practice": [], "level": lv,
                "topic": {"en": GROUPS.get(group, (group, group))[0], "pt": GROUPS.get(group, (group, group))[1]},
                "syllabus": {"no": r["No"], "group": group, "category": r["Category"], "details": r["Details"], "content": r["Content"]},
                "source": "HSK 3.0 grammar syllabus (GF 0025-2021); explanations written for Casus"}
        # a note's rule only for a point without forms of its own (之 under 结构助词 is drilled as 之, not 的)
        if note and note.get("match") and not forms and not frame:
            page["match"] = note["match"]
            if note.get("pool"):
                page["pool"] = note["pool"]
        elif frame:
            page["match"] = {"seq": [{"word": p} for p in frame], "near": 8, "gap": 0}
        elif forms:
            page["match"] = {"seq": [{"word": forms}]}
            if len(forms) >= 2:
                page["pool"] = forms
        # a passive point: 被/叫/让 + doer + verb (我叫Jack is a name, not a passive)
        if "被动" in (r["Details"] + r["Category"]) and page.get("match"):
            own = ["被"]   # 叫 and 让 are mostly "tell / let" (你凭什么叫我走), so the drill is on 被
            page["match"] = {"seq": [{"word": own}, {"pos": ["noun", "pron"]}, {"pos": "verb"}], "near": 3, "gap": 0}
        lessons[lid] = page
        levels.setdefault(lv, {}).setdefault(group, []).append({"id": lid, "title": page["title"], "meaning": meaning})
        questions.setdefault(lv, {})[lid] = {"pools": {"gap": page.get("pool", [])}, "qs": []}
    # wrong answers for a point with one form, or a frame: the forms of the other points of its category
    by_cat = {}
    for l in lessons.values():
        syl = l.get("syllabus")
        if syl and l.get("match"):
            words = [w for c in l["match"]["seq"][:1] for w in c.get("word", [])]
            by_cat.setdefault((syl["group"], syl["category"] if syl["group"] == "词类" else ""), []).extend(words)
    # the words that join clauses, and the doer/receiver markers: siblings for points outside the parts of speech
    connectors = ["因为", "所以", "但是", "可是", "不过", "虽然", "如果", "要是", "只要", "只有", "除非", "即使", "尽管", "无论", "不管",
                  "既然", "于是", "然后", "因此", "而且", "并且", "不但", "不仅", "或者", "还是", "就是", "就", "才", "都", "也", "却", "而"]
    agents = ["被", "叫", "让", "把", "给"]
    for l in lessons.values():
        syl = l.get("syllabus")
        if syl and l.get("match") and len(l.get("pool", [])) < 2:
            own = [w for c in l["match"]["seq"][:1] for w in c.get("word", [])]
            if any(w in agents for w in own):
                sib = [w for w in agents if w not in own]
            elif syl["group"] != "词类" and (any(w in connectors for w in own) or syl["group"] in ("句子的类型", "固定格式", "口语格式", "句群")):
                sib = [w for w in connectors if w not in own]
            else:
                sib = [w for w in dict.fromkeys(by_cat.get((syl["group"], syl["category"] if syl["group"] == "词类" else ""), [])) if w not in own]
            if sib:
                l["pool"] = (own + sib)[:12]
                questions[l["level"]][l["id"]]["pools"]["gap"] = l["pool"]
    out_levels = []
    for lv_raw in LEVELS:
        lv = level_id(lv_raw)
        if lv not in levels and not vocab[lv_raw]:
            continue
        topics = [{"id": f"{lv}-{g}", "kind": "grammar", "title": {"en": GROUPS.get(g, (g, g))[0], "pt": GROUPS.get(g, (g, g))[1]}, "lessons": e}
                  for g, e in levels.get(lv, {}).items()]
        words = vocab[lv_raw]
        if words and lv in levels:
            n = math.ceil(len(words) / 40)
            size = math.ceil(len(words) / n)
            entries = []
            for j in range(n):
                part = words[j * size:(j + 1) * size]
                wid = f"zh-{lv_raw}-v{j + 1}"
                lessons[wid] = {"id": wid, "kind": "vocab", "level": lv, "words": part, "source": "HSK 3.0 word list (ivankra/hsk30, MIT); English: CC-CEDICT (CC BY-SA)"}
                entries.append({"id": wid, "title": " · ".join(w["w"] for w in part[:4]) + " …", "meaning": {"en": f"{len(part)} words", "pt": f"{len(part)} palavras"}})
            topics.append({"id": f"{lv}-words", "kind": "vocab", "title": {"en": "Words", "pt": "Palavras"}, "lessons": entries})
        if lv in levels:
            out_levels.append({"id": lv, "topics": topics})
    index = {"system": "HSK 3.0", "levels": out_levels,
             "credit": {"en": "Grammar points: HSK 3.0 syllabus (GF 0025-2021) via ivankra/hsk30 (MIT); explanations and translations written for Casus; English glosses CC-CEDICT (CC BY-SA); sentences Tatoeba (CC BY 2.0 FR).",
                        "pt": "Pontos de gramática: programa do HSK 3.0 (GF 0025-2021) via ivankra/hsk30 (MIT); explicações e traduções escritas para o Casus; glosas em inglês do CC-CEDICT (CC BY-SA); frases do Tatoeba (CC BY 2.0 FR)."}}
    return index, lessons, questions
