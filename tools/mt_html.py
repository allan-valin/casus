"""HTML-safe machine translation for Learn pages (Allan, 2026-10-20: Learn content in German, Arabic and
Macedonian). Only English prose is sent to the model: text runs inside block elements, with inline elements (<b>,
<i>, <code>, <span>…) — almost always forms of the taught language — replaced by numbered placeholders [1], [2] and
put back afterwards. Short cells and lists of forms are left as they are. A translation that loses a placeholder is
not trusted: that run stays in English."""
from __future__ import annotations

import re
from html.parser import HTMLParser

INLINE = {"b", "strong", "i", "em", "code", "span", "a", "small", "sup", "sub", "u", "s", "mark", "ruby", "rt", "abbr", "bdi"}
STOP = set("the a an is are was were of to and in for with it that this as on be by or not from at which when its their "
           "they you your used use after before into than only also can may must have has more most other each these those".split())
PH = re.compile(r"\[(\d+)\]")


def is_english(text: str) -> bool:
    return is_prose(text, "en")


# the most frequent function words of each explanation language imported books use (Allan, 2026-10-20: every
# imported book translated); a run is prose of the language when enough of its words are among them
STOPS = {
    "en": STOP,
    "fr": set("le la les un une des de du et est sont en à au aux dans pour par sur avec que qui ne pas on il elle ce cette se son sa ses leur plus "
              "comme mais ou si nous vous ils elles être avoir fait".split()),
    "de": set("der die das den dem des ein eine einen einem einer und ist sind im in zu mit von für auf nicht sich auch als wie wird werden "
              "man es er sie wir ihr dass oder bei nach aus kann".split()),
    "es": set("el la los las un una unos de del y en es son que se con por para no al lo como más pero o su sus este esta".split()).union({"también"}),
    "pt": set("o a os as um uma de do da dos das e em no na nos nas é são que se com por para não ao como mais mas ou seu sua este esta".split()).union({"também"}),
    "it": set("il lo la i gli le un una di del della e è sono in nel nella che si con per non al come più ma o suo sua questo questa".split()).union({"anche"}),
    "nl": set("de het een en van in is zijn op te met voor niet die dat als ook aan bij door wordt worden er je we ze hij zij maar of".split()),
    "pl": set("i w na z się nie jest to że do o od po jak tak ale lub oraz przez dla są być który która".split()),
    "ru": set("и в на с не что это как по к о из за от для или но же бы так также есть быть который которые".split()),
    "uk": set("і й в у на з не що це як по до о із за від для або але же би так також є бути який які".split()),
    "cs": set("a v na s se je to že do o z od po jak tak ale nebo pro být který která".split()),
    "fi": set("ja on ei se että ovat tai kun myös kuin mutta niin jos joka mikä sen ne hän".split()),
    "hu": set("a az és egy hogy nem is van meg de ha mint vagy csak már még".split()),
    "el": set("και το η ο τα του της των στο στη με για να που δεν είναι από σε ένα μια".split()),
    "tr": set("ve bir bu da de ile için ne çok gibi daha olan olarak ama veya".split()),
    "is": set("og að í á er sem en við með til um ekki það hann hún".split()),
}
SCRIPT = {"ja": r"[\u3040-\u30ff\u4e00-\u9fff]", "zh": r"[\u4e00-\u9fff]", "ko": r"[\uac00-\ud7af]",
          "ar": r"[\u0600-\u06ff]", "grc": r"[\u0370-\u03ff\u1f00-\u1fff]", "sa": r"[\u0900-\u097f]"}


def is_prose(text: str, lang: str) -> bool:
    """is this run explanation in `lang` (worth translating), not a form or list of forms of the taught language?"""
    if lang in SCRIPT:
        letters = re.findall(r"[^\W\d_]", text)
        return len(letters) >= 8 and len(re.findall(SCRIPT[lang], text)) / len(letters) >= 0.6 and bool(re.search(r"[。、，．！？؟.,]", text) or len(letters) >= 20)
    words = re.findall(r"[^\W\d_]+(?:'[^\W\d_]+)?", text)
    if len(words) < 3:
        return False
    stops = STOPS.get(lang, STOP)
    return sum(w.lower() in stops for w in words) >= max(1, len(words) // 8) and \
        sum(w.lower() in stops for w in words) > max((sum(w.lower() in o for w in words) for k, o in STOPS.items() if k != lang), default=0) * 0.7


class _Tokens(HTMLParser):
    def __init__(self):
        super().__init__(convert_charrefs=False)
        self.out = []

    def handle_starttag(self, tag, attrs):
        self.out.append(("start", tag, self.get_starttag_text()))

    def handle_startendtag(self, tag, attrs):
        self.out.append(("empty", tag, self.get_starttag_text()))

    def handle_endtag(self, tag):
        self.out.append(("end", tag, f"</{tag}>"))

    def handle_data(self, data):
        self.out.append(("text", None, data))

    def handle_entityref(self, name):
        self.out.append(("text", None, f"&{name};"))

    def handle_charref(self, name):
        self.out.append(("text", None, f"&#{name};"))


def segments(html: str, src: str = "en") -> list:
    """the page as a list of pieces: {"raw": html kept as is} or a prose run {"text": with placeholders, "inline":
    [html of each placeholder], "translate": bool}"""
    p = _Tokens()
    p.feed(html)
    p.close()
    out, run, inline, depth, buf = [], [], [], 0, []

    def flush():
        nonlocal run, inline
        if not run:
            return
        text = "".join(run)
        plain = PH.sub(" ", text)
        out.append({"text": text, "inline": inline, "translate": is_prose(plain, src)})
        run, inline = [], []

    in_table = 0
    for kind, tag, raw in p.out:
        if tag == "table":
            in_table += 1 if kind == "start" else -1 if kind == "end" else 0
        if depth:                                    # inside an inline element: collect it whole
            buf.append(raw)
            if tag in INLINE and kind == "start":
                depth += 1
            elif tag in INLINE and kind == "end":
                depth -= 1
                if not depth:
                    inline.append("".join(buf))
                    run.append(f"[{len(inline)}]")
                    buf = []
            continue
        if kind == "start" and tag in INLINE:
            depth, buf = 1, [raw]
            continue
        if kind == "text":
            run.append(raw)
            continue
        flush()
        out.append({"raw": raw})
    if buf:
        run.append("".join(buf))
    flush()
    # a table's cells: only an English run of three words or more is translated (headers, notes), never forms
    return out


def translate_html(html: str, translate, src: str = "en") -> str:
    """translate(list of strings) -> list of strings, the model call; returns the page with its prose in `src` (the
    book's explanation language) replaced"""
    segs = segments(html, src)
    todo = [s for s in segs if "text" in s and s["translate"]]
    done = translate([s["text"].strip() for s in todo]) if todo else []
    for s, t in zip(todo, done):
        want = sorted(PH.findall(s["text"]))
        if sorted(PH.findall(t)) == want and t.strip():
            lead = s["text"][: len(s["text"]) - len(s["text"].lstrip())]
            trail = s["text"][len(s["text"].rstrip()):]
            s["out"] = lead + t.strip() + trail
    parts = []
    for s in segs:
        if "raw" in s:
            parts.append(s["raw"])
        else:
            text = s.get("out", s["text"])
            parts.append(PH.sub(lambda m: s["inline"][int(m.group(1)) - 1] if 0 < int(m.group(1)) <= len(s["inline"]) else m.group(0), text))
    return "".join(parts)


# grammar terms the model gets wrong ("neuters" → Kastraten, "subjunctive" → конјугација): each is swapped for a
# placeholder before translation and filled with the right term after. Longest first; plural and singular both.
TERMS = {
    "de": {"nominative": "Nominativ", "accusative": "Akkusativ", "genitive": "Genitiv", "dative": "Dativ", "vocative": "Vokativ",
           "instrumental": "Instrumental", "locative": "Lokativ", "ablative": "Ablativ", "partitive": "Partitiv", "prepositional": "Präpositiv",
           "neuters": "Neutra", "masculines": "Maskulina", "feminines": "Feminina",
           "singular": "Singular", "plural": "Plural", "dual": "Dual", "subjunctive": "Konjunktiv", "indicative": "Indikativ", "imperative": "Imperativ",
           "conditional": "Konditional", "infinitive": "Infinitiv", "participle": "Partizip", "participles": "Partizipien", "gerund": "Gerundium",
           "aorist": "Aorist", "imperfect": "Imperfekt", "perfect": "Perfekt", "pluperfect": "Plusquamperfekt", "preterite": "Präteritum",
           "aspect": "Aspekt", "suffix": "Suffix", "prefix": "Präfix", "stem": "Stamm",
           "ending": "Endung", "endings": "Endungen", "declension": "Deklination", "conjugation": "Konjugation", "clitic": "Klitikon", "clitics": "Klitika",
           "preposition": "Präposition", "prepositions": "Präpositionen", "conjunction": "Konjunktion", "particle": "Partikel", "particles": "Partikeln",
           "direct object": "direktes Objekt", "indirect object": "indirektes Objekt", "passive": "Passiv", "middle voice": "Medium", "comparative": "Komparativ", "superlative": "Superlativ"},
}
_TERM_RE = {}


def protect_terms(text: str, ui: str) -> tuple:
    """the text with each known grammar term replaced by a placeholder [N] (numbered after any already there), and
    the target-language terms in placeholder order"""
    table = TERMS.get(ui)
    if not table:
        return text, []
    rx = _TERM_RE.get(ui) or _TERM_RE.setdefault(ui, re.compile(r"\b(" + "|".join(sorted(map(re.escape, table), key=len, reverse=True)) + r")\b", re.I))
    start = max([int(n) for n in PH.findall(text)] or [0])
    terms = []

    def sub(m):
        word = table[m.group(1).lower()]
        terms.append(word[:1].upper() + word[1:] if m.group(1)[:1].isupper() else word)
        return f"[{start + len(terms)}]"
    return rx.sub(sub, text), terms


def dedupe(out: str, src: str) -> str:
    """the model sometimes says it twice ("Beispiele Beispiele:"): a repeated sentence or a doubled short phrase is
    cut to once; a final stop the English did not have is dropped"""
    sents = re.split(r"(?<=[.!?:;])\s+", out.strip())
    keep = [x for k, x in enumerate(sents) if k == 0 or x.strip(" .:;") != sents[k - 1].strip(" .:;")]
    out = " ".join(keep)
    words = out.split()
    for n in range(1, len(words) // 2 + 1):
        if [w.strip(".:;,") for w in words[:n]] == [w.strip(".:;,") for w in words[n:2 * n]] and len(src.split()) <= 6:
            out = " ".join(words[:n])
            break
    if src.strip() and src.strip()[-1] not in ".:;!?" and out[-1:] in ".:;":
        out = out[:-1]
    return out.strip(" :") if not src.strip().endswith(":") else out
