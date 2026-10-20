#!/usr/bin/env python3
"""Learn pages in every interface language by machine translation (Allan, 2026-10-20: every imported, human-written
book in en/pt/de/mk/ar, tagged AI-translated; the original stays one click away).

Model: MADLAD-400 3B (Google, Apache-2.0), CTranslate2 int8 conversion (vendor/mt/madlad400-3b-ct2), on the GPU.
Only prose in the page's explanation language is translated (its source: "Wikibooks (fr)" → French, a book written in
English → English; tools/mt_html.py keeps forms of the taught language and tables of forms as they are); every
translation is kept in vendor/mt/cache.<ui>.json, so a rebuild translates only what is new. Pages get "mt": {"<ui>":
"MADLAD-400"} and "src" (the original's language); a field translated into English keeps the original as "orig".
AI-written lessons are not done this way (tools/curricula/<code>/i18n/<ui>.yml), nor graded readers (the story is
the lesson).

usage (the GPU venv; CTranslate2 needs CUDA 12 cuBLAS on LD_LIBRARY_PATH):
  python tools/translate_learn.py <code> [<code>…] --ui pt"""
from __future__ import annotations

import argparse
import json
import os
import re
import sys
from html import unescape
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from mt_html import PH, dedupe, is_prose, protect_terms, translate_html  # noqa: E402

ROOT = Path(__file__).resolve().parents[1]
MODEL = ROOT / "vendor" / "mt" / "madlad400-3b-ct2"
def pieces_of(text: str) -> list:
    """a text cut into lines (each keeps its line break), sentences, and a sentence longer than 600 characters (a list
    run on with commas) also at commas"""
    out = []
    for p in [x for line in re.split(r"(?<=\n)", text) for x in SENT.split(line)]:
        cjk = len(re.findall(r"[\u3040-\u30ff\u4e00-\u9fff\uac00-\ud7af]", p)) > len(p) // 3
        limit = 200 if cjk else 600          # a CJK character is about one token
        while len(p) > limit:
            cut = max(p.rfind(", ", 0, limit), p.rfind("、", 0, limit) - 1, p.rfind("，", 0, limit) - 1)
            cut = cut + 2 if cut > limit // 6 else (p.rfind(" ", 0, limit) + 1 or limit)
            out.append(p[:cut])
            p = p[cut:]
        out.append(p)
    return out


SENT = re.compile(r"(?<=[.!?;])\s+(?=[A-ZÀ-ÞА-ЯЁΑ-Ω\[(¿¡])|(?<=[。！？])")
# a book whose source line names no edition: its explanation language when it is not English
SRC_OF = {"Grammaire française": "fr", "Antología abierta": "es", "Dz.U.": "pl", "Gramática de la lengua castellana": "es",
          "Kleine deutsche Sprachlehre": "de", "Le Premier Livre": "fr"}


def fixes(ui: str) -> dict:
    """sentences corrected by proofreading (tools/mt_fixes/<ui>.yml, in git; the cache is not): source → translation"""
    import yaml
    f = ROOT / "tools" / "mt_fixes" / f"{ui}.yml"
    return (yaml.safe_load(f.read_text(encoding="utf-8")) or {}) if f.exists() else {}


def too_long(src: str) -> int:
    """the longest believable translation: twice the original, five times for dense CJK text"""
    cjk = len(re.findall(r"[\u3040-\u30ff\u4e00-\u9fff\uac00-\ud7af]", src)) > len(src) // 3
    return (5 if cjk else 2) * len(src) + 20


def join(pieces: list, done: dict) -> str:
    """the pieces' translations put back together: a piece that ended a line keeps its line break"""
    out = ""
    for p in pieces:
        key = p.strip()
        if not key:
            out += p
            continue
        out += done.get(key, key) + (p[len(p.rstrip()):] or " ")
    return out.rstrip(" ")


class Translator:
    def __init__(self, ui: str):
        import ctranslate2
        import sentencepiece as spm
        self.ui = ui
        self.model = ctranslate2.Translator(str(MODEL), device="cuda", compute_type="int8_float16")
        self.sp = spm.SentencePieceProcessor(model_file=str(MODEL / "spiece.model"))
        self.cache_file = ROOT / "vendor" / "mt" / f"cache.{ui}.json"
        self.cache = json.loads(self.cache_file.read_text(encoding="utf-8")) if self.cache_file.exists() else {}
        self.cache.update(fixes(ui))
        self.new = 0
        # Japanese, Chinese and Korean explanations go through English (straight into Portuguese MADLAD made things
        # up, 2026-10-20); the English step is kept in cache.en-pivot.json for every other interface language
        self.src = "en"
        self.en_file = ROOT / "vendor" / "mt" / "cache.en-pivot.json"
        self.en_cache = json.loads(self.en_file.read_text(encoding="utf-8")) if self.en_file.exists() else {}

    def _raw(self, texts: list, ui: str | None = None, beam: int = 2) -> list:
        # the input must end with </s>: without it the model goes on writing after the sentence
        toks = [self.sp.encode(f"<2{ui or self.ui}> {t}", out_type=str) + ["</s>"] for t in texts]
        print(f"batch: {len(toks)} inputs, longest {max(map(len, toks))} tokens", file=sys.stderr, flush=True) if os.environ.get("MT_DEBUG") else None
        res = self.model.translate_batch(toks, beam_size=beam, max_batch_size=max(1, min(16, (1800 if beam <= 2 else 900) // max(map(len, toks)))), no_repeat_ngram_size=6,
                                         max_decoding_length=min(512, max(32, int(1.8 * max(len(t) for t in toks)) + 8)))
        return [self.sp.decode(r.hypotheses[0]) for r in res]

    def _model(self, texts: list, ui: str | None = None, beam: int = 2) -> list:
        """the model on a batch; out of GPU memory, the batch is halved, and a sentence that still does not fit stays
        as it is (the checker then shows it untranslated). A CJK source goes through English, at beam 4."""
        if ui is None and getattr(self, "src", "en") in PIVOT and self.ui != "en":
            todo = [t for t in dict.fromkeys(texts) if t not in self.en_cache]
            if todo:
                self.en_cache.update(zip(todo, self._model(todo, "en", 4)))
            return self._model([self.en_cache[t] for t in texts], self.ui, 4)
        if ui is None and getattr(self, "src", "en") in PIVOT:
            ui, beam = self.ui, 4
        try:
            return self._raw(texts, ui, beam) if (ui, beam) != (None, 2) else self._raw(texts)
        except RuntimeError as e:
            if "out of memory" not in str(e):
                raise
            if len(texts) == 1:
                return texts
            half = len(texts) // 2
            return self._model(texts[:half], ui, beam) + self._model(texts[half:], ui, beam)

    def __call__(self, texts: list) -> list:
        """each text cut into sentences, each sentence translated once ever"""
        pieces = [pieces_of(t) for t in texts]
        todo = sorted({p.strip() for ps in pieces for p in ps if p.strip() and p.strip() not in self.cache})
        for k in range(0, len(todo), 96):
            batch = [protect_terms(x, self.ui) for x in todo[k:k + 96]]
            outs = self._model([x for x, _ in batch])
            # a lost placeholder: one more try with {n} (the model keeps braces better), brought back to [n]
            bad = [i for i, ((prot, _), out) in enumerate(zip(batch, outs)) if sorted(PH.findall(out)) != sorted(PH.findall(prot))]
            if bad:
                again = self._model([PH.sub(r"{\1}", batch[i][0]) for i in bad])
                for i, out in zip(bad, again):
                    outs[i] = re.sub(r"\{(\d+)\}", r"[\1]", out)
            for src, (prot, terms), out in zip(todo[k:k + 96], batch, outs):
                # the grammar terms go back in as the glossary has them; a lost placeholder keeps the original
                first = max([int(n) for n in PH.findall(src)] or [0])
                if sorted(PH.findall(out)) != sorted(PH.findall(prot)) or len(out) > too_long(src):
                    self.cache[src] = src          # (a much longer output is the model looping or inventing)
                else:
                    out = PH.sub(lambda m: terms[int(m.group(1)) - first - 1] if first < int(m.group(1)) <= first + len(terms) else m.group(0), out)
                    self.cache[src] = dedupe(out, src)
                self.new += 1
            if self.new and self.new % 960 < 96:
                self.save()
        return [join(ps, self.cache) for ps in pieces]

    def save(self):
        self.cache_file.write_text(json.dumps(self.cache, ensure_ascii=False), encoding="utf-8")
        if getattr(self, "en_cache", None):
            self.en_file.write_text(json.dumps(self.en_cache, ensure_ascii=False), encoding="utf-8")


PIVOT = {"ja", "zh", "ko"}   # explanation languages translated through English


class Missing(Exception):
    """a sentence the cache does not have (cache-only mode)"""


class CacheOnly:
    """translations from the cache alone, no model (after a rebuild); a text with an uncached sentence raises Missing"""
    def __init__(self, ui: str, cache: dict | None = None):
        self.ui, self.new = ui, 0
        self.cache = cache if cache is not None else (json.loads(f.read_text(encoding="utf-8")) if (f := ROOT / "vendor" / "mt" / f"cache.{ui}.json").exists() else {})
        self.cache.update(fixes(ui))

    def __call__(self, texts: list) -> list:
        pieces = [pieces_of(t) for t in texts]
        if any(p.strip() and p.strip() not in self.cache for ps in pieces for p in ps):
            raise Missing
        return [join(ps, self.cache) for ps in pieces]

    def save(self):
        pass


def source_language(page: dict) -> str | None:
    """the language a page explains in: the edition its source names, else a known book's, else English; None for a
    graded reader (the text is the taught language itself)"""
    src = page.get("source") or ""
    if "Storybooks" in src:
        return None
    m = re.search(r"\b(?:Wikibooks|Wikiversity|Wikisource) \(([a-z]{2,3})\)", src)
    if m:
        return m.group(1)
    return next((v for k, v in SRC_OF.items() if k in src), "en")


def _orig(obj: dict) -> str:
    return obj.get("orig", obj.get("en"))


def _todo(obj: dict, ui: str) -> bool:
    """not yet in `ui`: missing or only a copy of the original (into English: the original not yet moved aside)"""
    if not _orig(obj):
        return False
    return "orig" not in obj if ui == "en" else (not obj.get(ui) or obj[ui] == _orig(obj))


def _put(obj: dict, ui: str, out: str, src: str) -> None:
    if ui == "en" and src != "en" and "orig" not in obj:
        obj["orig"] = obj["en"]
    obj[ui] = out


EX = re.compile(r'(<div class="ex">\s*<p class="ja"[^>]*>((?:(?!</p>).)*)</p>)(\s*</div>)', re.S)


def gloss_examples(html: str, tr) -> str:
    """an example block with no translation (the NIKL dictionary's) gets one: <p class="en gloss"> in tr.ui"""
    todo = [m for m in EX.finditer(html) if 'class="en' not in m.group(0)]
    if not todo:
        return html
    try:
        done = tr([unescape(re.sub(r"<[^>]+>", "", m.group(2))).strip() for m in todo])
    except Missing:
        return html
    out, pos = [], 0
    for m, t in zip(todo, done):
        safe = t.replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;")
        out += [html[pos:m.end(1)], f'<p class="en gloss">{safe}</p>', m.group(3)]
        pos = m.end()
    return "".join(out) + html[pos:]


def gloss_field(obj: dict, tr) -> bool:
    """examples in the field's text for tr.ui get their translation line; into English the original is kept as orig"""
    if not isinstance(obj, dict) or not _orig(obj) or 'class="ex"' not in _orig(obj):
        return False
    cur = obj.get(tr.ui) if obj.get(tr.ui) and (tr.ui != "en" or "orig" in obj) else _orig(obj)
    new = gloss_examples(cur, tr)
    if new == cur:
        return False
    if tr.ui == "en" and "orig" not in obj:
        obj["orig"] = obj["en"]
    obj[tr.ui] = new
    return True


def text_field(obj: dict, tr, src: str = "en") -> bool:
    """a short text (meaning, title): translated whole when it is words of the explanation language"""
    orig = _orig(obj)
    if not orig or src == tr.ui or not _todo(obj, tr.ui) or not re.search(r"[^\W\d_]{3}", orig):
        return False
    if not (is_prose(orig, src) or len(orig.split()) <= 6):
        return False
    try:
        # plain characters for the model (&quot; → "), escaped again when the original had entities
        out = tr([unescape(orig)])[0]
        if unescape(orig) != orig:
            out = out.replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;").replace('"', "&quot;")
        _put(obj, tr.ui, out, src)
    except Missing:
        return False
    return True


def html_field(obj: dict, tr, src: str = "en") -> bool:
    orig = _orig(obj)
    if not orig or src == tr.ui or not _todo(obj, tr.ui):
        return False
    try:
        out = translate_html(orig, tr, src)
    except Missing:
        return False
    if out != orig:
        _put(obj, tr.ui, out, src)
        return True
    return False


def translate_language(code: str, tr, redo: bool = False) -> int:
    """the imported pages of one language into tr.ui; then the index's titles and meanings of those pages"""
    data = ROOT / "data" / code
    srcs, n = {}, 0
    for f in sorted((data / "learn").glob("*.json")):
        if f.name.startswith("q-"):
            continue
        page = json.loads(f.read_text(encoding="utf-8"))
        if page.get("kind") in ("vocab", "kanji") or page.get("ai") or page.get("generated"):
            continue
        src = source_language(page)
        if not src:
            continue
        srcs[page.get("id", f.stem)] = src
        tr.src = src
        if redo and (page.get("mt") or {}).get(tr.ui):        # an earlier translation into this language is dropped
            for obj in [page.get(k) for k in ("meaning", "topic")] + [s.get("html") for s in page.get("sections", [])]:
                if isinstance(obj, dict) and tr.ui in obj and obj.get(tr.ui) != _orig(obj):
                    if tr.ui == "en":
                        obj["en"] = obj.pop("orig", obj["en"])
                    else:
                        del obj[tr.ui]
        # a page whose text is plain strings (JLPT Grammar Enhanced) gets {"en": …} fields, the original under "en"
        for key in ("meaning", "topic", "intro"):
            if isinstance(page.get(key), str) and page[key].strip():
                page[key] = {"en": page[key]}
        for s in page.get("sections", []):
            for key in ("title", "html"):
                if isinstance(s.get(key), str) and s[key].strip():
                    s[key] = {"en": s[key]}
        changed = False
        for key in ("meaning", "topic"):
            if isinstance(page.get(key), dict):
                changed |= text_field(page[key], tr, src)
        if isinstance(page.get("intro"), dict):
            changed |= html_field(page["intro"], tr, src)
        for s in page.get("sections", []):
            if isinstance(s.get("title"), dict):
                changed |= text_field(s["title"], tr, src)
            if isinstance(s.get("html"), dict):
                changed |= html_field(s["html"], tr, src)
        # examples without a translation (the NIKL dictionary's) get one, even when the page is in tr.ui already
        tr.src = code          # the examples are in the taught language
        for obj in [page.get("intro")] + [s.get("html") for s in page.get("sections", [])]:
            changed |= gloss_field(obj, tr)
        tr.src = src
        if changed:
            page.setdefault("mt", {})[tr.ui] = "MADLAD-400"
            page["src"] = src
            f.write_text(json.dumps(page, ensure_ascii=False, separators=(",", ":")), encoding="utf-8")
            n += 1
    index_file = data / "learn.json"
    if index_file.exists():
        index = json.loads(index_file.read_text(encoding="utf-8"))
        for lv in index.get("levels", []):
            for t in lv.get("topics", []):
                ids = [e.get("id") for e in t.get("lessons", [])]
                tsrc = next((srcs[i] for i in ids if i in srcs), None)
                if tsrc and isinstance(t.get("title"), dict):
                    tr.src = tsrc
                    text_field(t["title"], tr, tsrc)
                for e in t.get("lessons", []):
                    if e.get("id") in srcs and isinstance(e.get("meaning"), dict):
                        m = e["meaning"]
                        if redo and m.get(tr.ui) and m.get(tr.ui) != _orig(m):
                            if tr.ui == "en":
                                m["en"] = m.pop("orig", m["en"])
                            else:
                                del m[tr.ui]
                        tr.src = srcs[e["id"]]
                        text_field(m, tr, srcs[e["id"]])
        index_file.write_text(json.dumps(index, ensure_ascii=False, separators=(",", ":")), encoding="utf-8")
    tr.save()
    return n


if __name__ == "__main__":
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument("codes", nargs="+")
    ap.add_argument("--ui", required=True, choices=["en", "pt", "de", "mk", "ar"])
    ap.add_argument("--cache-only", action="store_true", help="re-apply cached translations after a rebuild (no GPU)")
    ap.add_argument("--redo", action="store_true", help="translate again pages already translated into this language")
    a = ap.parse_args()
    tr = CacheOnly(a.ui) if a.cache_only else Translator(a.ui)
    for c in a.codes:
        print(f"{c}: {translate_language(c, tr, a.redo)} pages machine-translated into {a.ui} ({tr.new} new sentences so far)", flush=True)
