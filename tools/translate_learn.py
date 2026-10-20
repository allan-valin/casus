#!/usr/bin/env python3
"""Learn pages in German by machine translation (Allan, 2026-10-20: Learn content in German, Arabic and Macedonian).

Model: MADLAD-400 3B (Google, Apache-2.0), CTranslate2 int8 conversion (vendor/mt/madlad400-3b-ct2), on the GPU.
Only English prose is translated (tools/mt_html.py: forms of the taught language and tables of forms stay as they
are); every translation is kept in vendor/mt/cache.<ui>.json, so a rebuild translates only what is new. Pages get
"mt": {"<ui>": "MADLAD-400"} and the page says the text is machine-translated. Macedonian and Arabic are NOT done
this way (the model gets grammar terms wrong there); they come from tools/curricula/<code>/i18n/<ui>.yml.

usage (the GPU venv; CTranslate2 needs CUDA 12 cuBLAS on LD_LIBRARY_PATH):
  python tools/translate_learn.py <code> [<code>…] [--ui de]"""
from __future__ import annotations

import argparse
import json
import re
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from mt_html import PH, dedupe, is_english, protect_terms, translate_html  # noqa: E402

ROOT = Path(__file__).resolve().parents[1]
MODEL = ROOT / "vendor" / "mt" / "madlad400-3b-ct2"
SENT = re.compile(r"(?<=[.!?;])\s+(?=[A-Z\[(])")


class Translator:
    def __init__(self, ui: str):
        import ctranslate2
        import sentencepiece as spm
        self.ui = ui
        self.model = ctranslate2.Translator(str(MODEL), device="cuda", compute_type="int8_float16")
        self.sp = spm.SentencePieceProcessor(model_file=str(MODEL / "spiece.model"))
        self.cache_file = ROOT / "vendor" / "mt" / f"cache.{ui}.json"
        self.cache = json.loads(self.cache_file.read_text(encoding="utf-8")) if self.cache_file.exists() else {}
        self.new = 0

    def _model(self, texts: list) -> list:
        toks = [self.sp.encode(f"<2{self.ui}> {t}", out_type=str) for t in texts]
        res = self.model.translate_batch(toks, beam_size=4, max_batch_size=24, no_repeat_ngram_size=4, repetition_penalty=1.15,
                                         max_decoding_length=max(32, int(1.8 * max(len(t) for t in toks)) + 8))
        return [self.sp.decode(r.hypotheses[0]) for r in res]

    def __call__(self, texts: list) -> list:
        """each text cut into sentences, each sentence translated once ever"""
        pieces = [SENT.split(t) for t in texts]
        todo = sorted({p for ps in pieces for p in ps if p.strip() and p not in self.cache})
        for k in range(0, len(todo), 96):
            batch = [protect_terms(x, self.ui) for x in todo[k:k + 96]]
            for src, (prot, terms), out in zip(todo[k:k + 96], batch, self._model([x for x, _ in batch])):
                # the grammar terms go back in as the glossary has them; a lost placeholder keeps the English
                first = max([int(n) for n in PH.findall(src)] or [0])
                if sorted(PH.findall(out)) != sorted(PH.findall(prot)):
                    self.cache[src] = src
                else:
                    out = PH.sub(lambda m: terms[int(m.group(1)) - first - 1] if first < int(m.group(1)) <= first + len(terms) else m.group(0), out)
                    self.cache[src] = dedupe(out, src)
                self.new += 1
            if self.new and self.new % 960 < 96:
                self.save()
        return [" ".join(self.cache.get(p, p) for p in ps) for ps in pieces]

    def save(self):
        self.cache_file.write_text(json.dumps(self.cache, ensure_ascii=False), encoding="utf-8")


def text_field(obj: dict, tr) -> bool:
    """a short text (meaning, title): translated whole when it is English words"""
    en = obj.get("en")
    if not en or obj.get(tr.ui) or not re.search(r"[A-Za-z]{3}", en):
        return False
    obj[tr.ui] = tr([en])[0] if (is_english(en) or len(en.split()) <= 6) else en
    return True


def html_field(obj: dict, tr) -> bool:
    en = obj.get("en")
    if not en or obj.get(tr.ui):
        return False
    out = translate_html(en, tr)
    if out != en:
        obj[tr.ui] = out
        return True
    return False


def translate_language(code: str, tr) -> int:
    data = ROOT / "data" / code
    index = json.loads((data / "learn.json").read_text(encoding="utf-8"))
    n = 0
    for lv in index["levels"]:
        if isinstance(lv.get("title"), dict):
            text_field(lv["title"], tr)
        for t in lv["topics"]:
            if isinstance(t.get("title"), dict):
                text_field(t["title"], tr)
            for e in t["lessons"]:
                if isinstance(e.get("meaning"), dict):
                    text_field(e["meaning"], tr)
    if isinstance(index.get("credit"), dict):
        html_field(index["credit"], tr) or text_field(index["credit"], tr)
    (data / "learn.json").write_text(json.dumps(index, ensure_ascii=False, separators=(",", ":")), encoding="utf-8")
    for f in sorted((data / "learn").glob("*.json")):
        if f.name.startswith("q-"):
            continue
        page = json.loads(f.read_text(encoding="utf-8"))
        if page.get("kind") in ("vocab", "kanji"):
            continue
        changed = False
        for key in ("meaning", "topic"):
            if isinstance(page.get(key), dict):
                changed |= text_field(page[key], tr)
        if isinstance(page.get("intro"), dict):
            changed |= html_field(page["intro"], tr)
        for s in page.get("sections", []):
            if isinstance(s.get("title"), dict):
                changed |= text_field(s["title"], tr)
            if isinstance(s.get("html"), dict):
                changed |= html_field(s["html"], tr)
        if changed:
            page.setdefault("mt", {})[tr.ui] = "MADLAD-400"
            f.write_text(json.dumps(page, ensure_ascii=False, separators=(",", ":")), encoding="utf-8")
            n += 1
    tr.save()
    return n


if __name__ == "__main__":
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument("codes", nargs="+")
    ap.add_argument("--ui", default="de")
    a = ap.parse_args()
    tr = Translator(a.ui)
    for c in a.codes:
        print(f"{c}: {translate_language(c, tr)} pages machine-translated into {a.ui} ({tr.new} new sentences so far)", flush=True)
