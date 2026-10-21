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
import collections
import functools
import json
import os
import re
import sys
from html import unescape
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from mt_html import PH, SCRIPT, STOPS, classical, dedupe, is_prose, protect_terms, translate_html  # noqa: E402

ROOT = Path(__file__).resolve().parents[1]
MODEL = ROOT / "vendor" / "mt" / "madlad400-3b-ct2"
def pieces_of(text: str) -> list:
    """a text cut into sentences, and a sentence longer than 600 characters (a list run on with commas) also at commas"""
    out = []
    # a line break inside a paragraph is a soft wrap: the lines are one text (a real break, <br> or a new block,
    # has already ended the run)
    text = re.sub(r"\s*\n\s*", " ", text)
    for p in SENT.split(text):
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
    """sentences corrected by proofreading or translated by Claude (tools/mt_fixes/<ui>.yml and, one file per book,
    tools/mt_fixes/<ui>/*.yml; in git, the cache is not): source → translation"""
    import yaml
    files = [ROOT / "tools" / "mt_fixes" / f"{ui}.yml"] + sorted((ROOT / "tools" / "mt_fixes" / ui).glob("*.yml"))
    out = {}
    for f in files:
        if f.exists():
            out.update(yaml.safe_load(f.read_text(encoding="utf-8")) or {})
    return out


def labels(ui: str) -> dict:
    """the English runs the prose test misses, translated by Claude (tools/mt_fixes/<ui>/labels.yml): table labels
    ("Form", "Verb (negative)") and example meanings without function words ("He looks well."); used only in a course
    written in another script, where an English run cannot be a form of the taught language"""
    import yaml
    f = ROOT / "tools" / "mt_fixes" / ui / "labels.yml"
    return (yaml.safe_load(f.read_text(encoding="utf-8")) or {}) if f.exists() else {}


LLM_URL = os.environ.get("CASUS_LLM_URL", "http://127.0.0.1:8099")
LANG_NAME = {"en": "English", "es": "Spanish", "fr": "French", "de": "German", "pl": "Polish", "pt": "Portuguese", "it": "Italian",
             "nl": "Dutch", "ru": "Russian", "uk": "Ukrainian", "mk": "Macedonian", "ar": "Arabic", "cs": "Czech", "fi": "Finnish",
             "hu": "Hungarian", "el": "Modern Greek", "grc": "Ancient Greek", "la": "Latin", "tr": "Turkish", "is": "Icelandic",
             "ja": "Japanese", "zh": "Chinese", "ko": "Korean", "sa": "Sanskrit"}
# the engines and their caches: MADLAD-400 (vendor/mt/cache.<ui>.json), EuroLLM-9B-Instruct (Apache-2.0, through a
# llama.cpp server; vendor/mt/cache.<ui>.eurollm.json; Allan, 2026-10-21: it read Arabic best of the open models
# tried), and Claude (tools/mt_fixes). A page records which of them translated it.
ENGINES = {"madlad": ("MADLAD-400", "cache.{ui}.json"), "eurollm": ("EuroLLM-9B", "cache.{ui}.eurollm.json")}


def load_caches(ui: str) -> tuple:
    """every translation into `ui` (Claude's over EuroLLM's over MADLAD's) and who made each"""
    cache, label = {}, {}
    for name, file in ENGINES.values():
        f = ROOT / "vendor" / "mt" / file.format(ui=ui)
        part = json.loads(f.read_text(encoding="utf-8")) if f.exists() else {}
        cache.update(part)
        label.update(dict.fromkeys(part, name))
    fx = fixes(ui)
    cache.update(fx)
    label.update(dict.fromkeys(fx, "Claude"))
    return cache, label


def llm_prompt(src: str, ui: str, course: str, text: str) -> str:
    """EuroLLM's translation prompt (its model card's form) with the two rules the pages need"""
    a, b = LANG_NAME.get(src, src), LANG_NAME.get(ui, ui)
    return (f"Translate the following {a} source text to {b}. Keep every placeholder like [1] or [2] exactly as it is, "
            f"and leave {LANG_NAME.get(course, course)} words and examples unchanged.\n{a}: {text}\n{b}:")


class Recorder:
    """lists what a book would send to the model (not yet in the fixes), sending nothing: tools/mt_pieces.py"""
    def __init__(self, ui: str):
        self.ui, self.new, self.src, self.cache, self.seen = ui, 0, "en", fixes(ui), {}

    def __call__(self, texts: list) -> list:
        for t in texts:
            for p in split(t, self.cache):
                if p.strip() and p.strip() not in self.cache and not studied(p, self.src):
                    self.seen.setdefault(p.strip(), None)
        raise Missing

    def save(self):
        pass


def pieces_for(code: str, ui: str, only: str) -> list:
    """the pieces (with their placeholders) the pages of `code` whose source names `only` would send for `ui`"""
    rec = Recorder(ui)
    translate_language(code, rec, redo=True, only=only, write=False)   # (earlier machine translations ignored)
    return list(rec.seen)


def studied(piece: str, src: str) -> bool:
    """a classical Japanese or kanbun sentence inside a Japanese explanation: the text studied, kept as it is"""
    return src == "ja" and classical(piece.strip())


def split(text: str, cache: dict) -> list:
    """a text's pieces: the text itself when it is in the cache whole (a label of two sentences Claude translated as
    one), else its sentences"""
    return [text] if text.strip() in cache else pieces_of(text)


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
    def __init__(self, ui: str, engine: str = "madlad"):
        self.ui, self.engine = ui, engine
        if engine == "madlad":
            import ctranslate2
            import sentencepiece as spm
            self.model = ctranslate2.Translator(str(MODEL), device="cuda", compute_type="int8_float16")
            self.sp = spm.SentencePieceProcessor(model_file=str(MODEL / "spiece.model"))
        self.name, file = ENGINES[engine]
        self.cache_file = ROOT / "vendor" / "mt" / file.format(ui=ui)
        self.own = json.loads(self.cache_file.read_text(encoding="utf-8")) if self.cache_file.exists() else {}
        self.cache, self.label = load_caches(ui)
        self.used, self.course = set(), "en"
        self.new = 0
        # Japanese, Chinese and Korean explanations go through English (straight into Portuguese MADLAD made things
        # up, 2026-10-20); the English step is kept in cache.en-pivot.json for every other interface language
        self.src = "en"
        self.en_file = ROOT / "vendor" / "mt" / "cache.en-pivot.json"
        self.en_cache = json.loads(self.en_file.read_text(encoding="utf-8")) if self.en_file.exists() else {}

    def _ask(self, text: str) -> str:
        import urllib.request
        body = {"messages": [{"role": "user", "content": llm_prompt(self.src, self.ui, self.course, text)}], "temperature": 0,
                "max_tokens": min(1024, 4 * len(text) + 64)}
        req = urllib.request.Request(f"{LLM_URL}/v1/chat/completions", data=json.dumps(body).encode(), headers={"Content-Type": "application/json"})
        return json.load(urllib.request.urlopen(req, timeout=600))["choices"][0]["message"]["content"].strip().split("\n")[0].strip()

    def _raw(self, texts: list, ui: str | None = None, beam: int = 2) -> list:
        if getattr(self, "engine", "madlad") != "madlad":          # the llama.cpp server has four slots
            from concurrent.futures import ThreadPoolExecutor
            with ThreadPoolExecutor(4) as ex:
                return list(ex.map(self._ask, texts))
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
        pieces = [split(t, self.cache) for t in texts]
        todo = sorted({p.strip() for ps in pieces for p in ps if p.strip() and p.strip() not in self.cache and not studied(p, getattr(self, "src", "en"))})
        for k in range(0, len(todo), 96):
            batch = [protect_terms(x, self.ui, getattr(self, "src", "en")) for x in todo[k:k + 96]]
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
                    if terms and re.match(rf"\[{first + 1}\]", out.lstrip()):     # a sentence that begins with a term
                        terms[0] = terms[0][:1].upper() + terms[0][1:]
                    out = PH.sub(lambda m: terms[int(m.group(1)) - first - 1] if first < int(m.group(1)) <= first + len(terms) else m.group(0), out)
                    self.cache[src] = dedupe(out, src)
                if hasattr(self, "own"):
                    self.own[src], self.label[src] = self.cache[src], self.name
                self.new += 1
            if self.new and self.new % 960 < 96:
                self.save()
        if hasattr(self, "used"):
            self.used.update(self.label.get(p.strip(), self.name) for ps in pieces for p in ps if p.strip())
        return [join(ps, self.cache) for ps in pieces]

    def save(self):
        self.cache_file.write_text(json.dumps(getattr(self, "own", self.cache), ensure_ascii=False), encoding="utf-8")
        if getattr(self, "en_cache", None):
            self.en_file.write_text(json.dumps(self.en_cache, ensure_ascii=False), encoding="utf-8")


PIVOT = {"ja", "zh", "ko"}   # explanation languages translated through English


class Missing(Exception):
    """a sentence the cache does not have (cache-only mode)"""


class CacheOnly:
    """translations from the cache alone, no model (after a rebuild); a text with an uncached sentence raises Missing"""
    def __init__(self, ui: str, cache: dict | None = None):
        self.ui, self.new, self.used = ui, 0, set()
        if cache is None:
            self.cache, self.label = load_caches(ui)
        else:
            self.cache, self.label = cache, {}
            self.cache.update(fixes(ui))

    def __call__(self, texts: list) -> list:
        src = getattr(self, "src", "en")
        pieces = [split(t, self.cache) for t in texts]
        if any(p.strip() and p.strip() not in self.cache and not studied(p, src) for ps in pieces for p in ps):
            raise Missing
        self.used.update(self.label.get(p.strip(), "MADLAD-400") for ps in pieces for p in ps if p.strip() and not studied(p, src))
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


# courses whose imported English books bold both the taught forms and their English glosses (Grimm Grammar:
# "there was a <b>rich</b> man"); there a bold English word is translated with its sentence
GLOSS_COURSES = {"de"}


@functools.lru_cache(maxsize=None)
def gloss_test(code: str, src: str = "en"):
    """for a course in GLOSS_COURSES, gloss(text) -> True when a bold run is in the book's explanation language `src`
    rather than a form of the taught language: more of its words are explanation-only (English: the course's English
    glosses and the system word lists; another language: its own course's forms) than forms of the course only. A
    word of both languages ("was", "die") decides nothing, so such a run stays protected."""
    if code not in GLOSS_COURSES:
        return None
    data = ROOT / "data" / code
    forms = {k.lower() for f in (data / "forms").glob("*.json") for k in json.loads(f.read_text(encoding="utf-8"))}
    if src == "en":
        counts = collections.Counter(w for v in json.loads((data / "glosses.en.json").read_text(encoding="utf-8")).values()
                                     for w in re.findall(r"[a-z]+", v.lower()))
        explanation = {w for w, c in counts.items() if c >= 3}
        # and the system's English word lists, where there are some: "ran", "heck", "exceptions" are German forms too
        for f in ("/usr/share/dict/american-english", "/usr/share/dict/british-english"):
            if Path(f).exists():
                explanation |= {w.strip().lower() for w in Path(f).read_text(encoding="utf-8", errors="ignore").splitlines() if w.strip().isalpha()}
    elif (ROOT / "data" / src / "forms").exists():
        explanation = {k.lower() for f in (ROOT / "data" / src / "forms").glob("*.json") for k in json.loads(f.read_text(encoding="utf-8"))}
        explanation |= STOPS.get(src, set())        # the forms lists leave out function words ("au", "du", "i")
    else:
        return None
    own = {"de": "äöüß"}.get(code, "")

    def counts_of(text: str) -> tuple:
        words = [w.lower() for w in re.findall(r"[^\W\d_]+", text)]
        return (sum(w in explanation and w not in forms for w in words),
                sum(w not in explanation and (w in forms or bool(own and re.search(f"[{own}]", w))) for w in words))

    def gloss(text: str) -> bool:
        en, de = counts_of(text)
        return en > de
    # a line that is certainly forms of the course (no explanation-only word, some course-only one): "backen, backte"
    gloss.taught = lambda text: (lambda en, de: de > 0 and en == 0)(*counts_of(text))
    return gloss


def html_field(obj: dict, tr, src: str = "en", gloss=None, label=None) -> bool:
    orig = _orig(obj)
    if not orig or src == tr.ui or not _todo(obj, tr.ui):
        return False
    try:
        out = translate_html(orig, tr, src, gloss, label)
    except Missing:
        return False
    if out != orig:
        _put(obj, tr.ui, out, src)
        return True
    return False


def translate_language(code: str, tr, redo: bool = False, only: str | None = None, write: bool = True) -> int:
    """the pages of `code` translated into tr.ui; what was translated is saved even when the run is stopped"""
    try:
        return _translate_language(code, tr, redo, only, write)
    finally:
        tr.save()


def _translate_language(code: str, tr, redo: bool, only: str | None, write: bool) -> int:
    """the imported pages of one language into tr.ui; then the index's titles and meanings of those pages"""
    data = ROOT / "data" / code
    srcs, n = {}, 0
    label = labels(tr.ui).__contains__ if code in SCRIPT else None
    for f in sorted((data / "learn").glob("*.json")):
        if f.name.startswith("q-"):
            continue
        page = json.loads(f.read_text(encoding="utf-8"))
        if page.get("kind") in ("vocab", "kanji") or page.get("ai") or page.get("generated"):
            continue
        src = source_language(page)
        # a grammar of the language written in it (Bohm's Sprachlehre): explanation and examples are one language and
        # a model translates the examples away (Allan's de>mk check, 2026-10-21), so the page stays as the book has it
        # (a Japanese, Chinese or Korean one quotes its examples in 「」, which are kept, so it is translated)
        if not src or src == code and code not in SCRIPT or only and only not in (page.get("source") or ""):
            continue
        srcs[page.get("id", f.stem)] = src
        tr.src, tr.course = src, code
        if hasattr(tr, "used"):
            tr.used = set()
        if redo and (page.get("mt") or {}).get(tr.ui):        # an earlier translation into this language is dropped
            intro = page.get("intro")    # (a short intro is Casus's own credit line, written in each language: kept)
            long_intro = [intro] if isinstance(intro, dict) and len(_orig(intro) or "") > 400 else []
            for obj in [page.get(k) for k in ("meaning", "topic")] + long_intro + [s.get("html") for s in page.get("sections", [])]:
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
        gloss = gloss_test(code, src) if src != code else None
        for key in ("meaning", "topic"):
            if isinstance(page.get(key), dict):
                changed |= text_field(page[key], tr, src)
        if isinstance(page.get("intro"), dict):
            changed |= html_field(page["intro"], tr, src, gloss, label)
        for s in page.get("sections", []):
            if isinstance(s.get("title"), dict):
                changed |= text_field(s["title"], tr, src)
            if isinstance(s.get("html"), dict):
                changed |= html_field(s["html"], tr, src, gloss, label)
        # examples without a translation (the NIKL dictionary's) get one, even when the page is in tr.ui already
        tr.src = code          # the examples are in the taught language
        for obj in [page.get("intro")] + [s.get("html") for s in page.get("sections", [])]:
            changed |= gloss_field(obj, tr)
        tr.src = src
        if changed:
            page.setdefault("mt", {})[tr.ui] = " + ".join(sorted(getattr(tr, "used", None) or {"MADLAD-400"}))
            page["src"] = src
            if write:
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
        if write:
            index_file.write_text(json.dumps(index, ensure_ascii=False, separators=(",", ":")), encoding="utf-8")
    return n


if __name__ == "__main__":
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument("codes", nargs="+")
    ap.add_argument("--ui", required=True, choices=["en", "pt", "de", "mk", "ar"])
    ap.add_argument("--cache-only", action="store_true", help="re-apply cached translations after a rebuild (no GPU)")
    ap.add_argument("--redo", action="store_true", help="translate again pages already translated into this language")
    ap.add_argument("--engine", choices=list(ENGINES), default="madlad", help="eurollm: a llama.cpp server at $CASUS_LLM_URL (tools/llm_server.sh)")
    a = ap.parse_args()
    import signal
    signal.signal(signal.SIGTERM, lambda *_: sys.exit(1))      # a kill runs the save in translate_language
    tr = CacheOnly(a.ui) if a.cache_only else Translator(a.ui, a.engine)
    for c in a.codes:
        print(f"{c}: {translate_language(c, tr, a.redo)} pages machine-translated into {a.ui} ({tr.new} new sentences so far)", flush=True)
