"""German lessons for the Learn tab from Grimm Grammar (COERLL, University of Texas at Austin, CC BY 4.0;
coerll.utexas.edu/gg; vendored in vendor/grimm/): one page per grammar point — explanation, examples with English
told through the Grimm fairy tales, the point highlighted — and the exercise sets of its answer key (multiple choice
and fill-in with a word bank, answers marked). Allan, 2026-10-19: real lessons, researched."""
from __future__ import annotations

import html as H
import re


def text_of(fragment: str) -> str:
    return H.unescape(re.sub(r"\s+", " ", re.sub(r"<[^>]+>", " ", fragment))).replace(" ,", ",").replace(" .", ".").strip()


def _tidy(t: str) -> str:
    return re.sub(r"\s+([,.;:!?])", r"\1", re.sub(r"\s+", " ", t)).strip()


def clean(fragment: str) -> str:
    f = re.sub(r"<!--.*?-->", "", fragment, flags=re.S)
    f = re.sub(r"<audio.*?</audio>", "", f, flags=re.S)
    f = re.sub(r'<div id="fp_\d+">.*?</div>', "", f, flags=re.S)
    f = re.sub(r"<img[^>]*>", "", f)
    f = re.sub(r"<a [^>]*onClick[^>]*>(.*?)</a>", r"\1", f, flags=re.S)
    f = re.sub(r'<span class="?hi_12_[0-9a-f]+(?:_alt)?"?>(.*?)</span>', r"<b>\1</b>", f, flags=re.S)
    f = re.sub(r'\s(class|id|style|width|height|valign|align)\s*=\s*"[^"]*"', "", f)
    f = re.sub(r"<(div|span)>\s*</\1>", "", f)
    return re.sub(r"\n\s*\n+", "\n", f).strip()


def parse_page(page: str) -> dict:
    title = re.search(r"<title>Grimm Grammar : (.*?) : (.*?)</title>", page)
    cat = re.search(r'<span class="h_16_8a97b2">(.*?)<span class="h_colon">', page)
    body = page.split('<div id="content_wrapper">', 1)[1]
    body = re.split(r"<!-- end content_wrapper -->|<div id=\"ex_wrapper\"", body)[0]
    body = re.sub(r'<p class="bot_050">\s*<img[^>]*><span class="h_16_8a97b2">.*?</p>', "", body, count=1, flags=re.S)
    examples = []
    for de_cell, en_cell in re.findall(r"<tr>\s*<td>(.*?)</td>\s*<td>(.*?)</td>\s*</tr>", body, flags=re.S):
        de, en = _tidy(text_of(de_cell)), _tidy(text_of(en_cell))
        if not de or not en or len(de.split()) < 2:
            continue
        hi = re.search(r'<span class="?hi_12_[0-9a-f]+"?>(.*?)</span>', de_cell, flags=re.S)
        examples.append({"text": de, "en": en, **({"target": _tidy(text_of(hi.group(1)))} if hi else {})})
    return {"en": H.unescape(title.group(1)).strip() if title else "", "de": H.unescape(title.group(2)).strip() if title else "",
            "category": H.unescape(cat.group(1)).strip() if cat else "", "html": clean(body), "examples": examples}


def parse_key(key: str) -> dict:
    """the answer key's exercise sets, by name (cas_02_01_mcr): task, word bank, items with their answers"""
    out = {}
    for name, block in re.findall(r'<a name="([a-z]+_\d+_\d+_(?:mcr|fib|[a-z]+))"></a>(.*?)(?=<a name="[a-z]+_\d+_\d+_|$)', key, flags=re.S):
        kind = name.rsplit("_", 1)[1]
        task = re.search(r'<p class="bot_150">(.*?)</p>', block, flags=re.S)
        bank = [_tidy(text_of(x)) for x in re.findall(r"<td>(.*?)</td>", (re.search(r'<table class="wb">(.*?)</table>', block, flags=re.S) or [None, ""])[1] if re.search(r'<table class="wb">', block) else "", flags=re.S)]
        items = []
        # each item runs from its number cell to the next (an item holds a nested table of options)
        chunks = re.split(r'<td(?: class="qnum")?>\s*<b>\d+\.?</b>\.?\s*</td>', block)[1:]
        for chunk in chunks:
            row = re.sub(r"</td>\s*</tr>\s*(<tr>\s*)?$", "", re.split(r"</table>\s*</div>", chunk)[0].strip())
            row = re.sub(r"^\s*<td>", "", row)
            if kind == "mcr" or "mc_vert" in row:
                prompt = re.sub(r"_{3,}", "＿＿", _tidy(text_of(row.split("<table", 1)[0])))
                opts = [_tidy(re.sub(r"^[a-z]\.\s*", "", text_of(o))) for o in re.findall(r"<td>(.*?)</td>", row.split("<table", 1)[1] if "<table" in row else "", flags=re.S)]
                ans = re.search(r'<span class="ans_mc">(.*?)</span>', row, flags=re.S)
                if prompt and opts and ans:
                    items.append({"prompt": prompt, "options": opts, "answer": _tidy(re.sub(r"^[a-z]\.\s*", "", text_of(ans.group(1))))})
            else:
                answers = re.findall(r'<span class="ans_fib">(.*?)</span>', row, flags=re.S)
                if not answers:
                    continue
                first = answers[0]
                text = row.replace(f'<span class="ans_fib">{first}</span>', "＿＿", 1)
                text = re.sub(r'<span class="ans_fib">(.*?)</span>', r"\1", text, flags=re.S)
                items.append({"text": _tidy(text_of(text)), "answer": _tidy(text_of(first))})
        out[name] = {"kind": "mcr" if kind == "mcr" else "fib", "task": _tidy(text_of(task.group(1))) if task else "", "bank": [b for b in bank if b and b != "Word bank"], "items": items}
    return out
