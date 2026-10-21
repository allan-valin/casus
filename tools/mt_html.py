"""HTML-safe machine translation for Learn pages (Allan, 2026-10-20: Learn content in German, Arabic and
Macedonian). Only English prose is sent to the model: text runs inside block elements, with inline elements (<b>,
<i>, <code>, <span>…) — almost always forms of the taught language — replaced by numbered placeholders [1], [2] and
put back afterwards. Short cells and lists of forms are left as they are. A translation that loses a placeholder is
not trusted: that run stays in English."""
from __future__ import annotations

import re
from html import unescape
from html.parser import HTMLParser

INLINE = {"b", "strong", "i", "em", "code", "span", "a", "small", "sup", "sub", "u", "s", "mark", "ruby", "rt", "abbr", "bdi"}
STOP = set("the a an is are was were of to and in for with it that this as on be by or not from at which when its their "
           "they you your used use after before into than only also can may must have has more most other each these those".split())
PH = re.compile(r"\[(\d+)\]")
TRANSPARENT = {"a", "span", "small", "abbr"}     # formatting around prose, not a form of the taught language


def is_english(text: str) -> bool:
    return is_prose(text, "en")


# the most frequent function words of each explanation language imported books use (Allan, 2026-10-20: every
# imported book translated); a run is prose of the language when enough of its words are among them
STOPS = {
    "en": STOP,
    "fr": set("le la les un une des de du et est sont en à au aux dans pour par sur avec que qui ne pas on il elle ce cette se son sa ses leur plus "
              "comme mais ou si nous vous ils elles être avoir fait je tu suis es sommes êtes ai as avons avez mon ma mes ton ta tes notre votre quel quelle".split()),
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


# classical Japanese (kobun) and kanbun read as Japanese to the prose test, but in a school book they are the studied
# text: kobun has its own auxiliaries and old kana spelling (向かひ, 言ふ), kanbun is kanji without kana; a line that
# also speaks modern Japanese (です, ている, だろう) is the book's explanation and is translated
KOBUN = re.compile(r"けり|(?<=[りにしたひきれ])け[るれ]|けむ|らむ|べし|べから|ざり|ざる|ざれ|まじ|めり|なむ|侍[りる]|候ふ|給[ふひへ]|たま[ふひへ]"
                   r"|[かや]は[。、]|にき|ぬる|ぬれ|ぬべ|つる|つれ|[\u4e00-\u9fff][ひふ](?=[てし、。もはをにど]|$)")
KOBUN_STRONG = re.compile(r"けり|べし|めり|侍[りる]|候ふ|給[ふひ]|たま[ふひ]|いみじ|をかし|[哉豈乎焉]")
MODERN = re.compile(r"です|ます|である|だろう|でしょう|ている|ていた|ていない|った[。、]|ない[。、]|ません|ように|という")


def classical(text: str) -> bool:
    """a line of classical Japanese or kanbun (quoted 「…」 words in an explanation do not count)"""
    bare = re.sub(r"「[^」]*」|（[^）]*）|\([^)]*\)", "", text)
    if MODERN.search(bare):
        return False
    cjk = len(re.findall(r"[\u4e00-\u9fff]", bare))
    if cjk >= 6 and not re.search(r"[\u3040-\u30ff]", bare) and (re.search(r"[。、，；？！]", bare) or cjk >= 12):
        return True
    if re.match(r"\s*[（(]?例文", text):     # a school book's example sentence is classical text
        return True
    return len(KOBUN.findall(bare)) + 2 * len(KOBUN_STRONG.findall(bare)) >= 2


def is_prose(text: str, lang: str) -> bool:
    """is this run explanation in `lang` (worth translating), not a form or list of forms of the taught language?"""
    if lang == "ja" and classical(text):
        return False
    if lang in SCRIPT:
        letters = re.findall(r"[^\W\d_]", text)
        return len(letters) >= 8 and len(re.findall(SCRIPT[lang], text)) / len(letters) >= 0.6 and bool(re.search(r"[。、，．！？؟.,]", text) or len(letters) >= 20)
    words = re.findall(r"[^\W\d_]+(?:'[^\W\d_]+)?", text)
    stops = STOPS.get(lang, STOP)
    if len(words) < 3:
        # a short line (a heading, "Par exemple :") is prose when it has a function word of the language and none
        # of another
        return len(words) >= 2 and any(w.lower() in stops for w in words) and \
            not any(w.lower() in o for k, o in STOPS.items() if k != lang for w in words if w.lower() not in stops)
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


# the script an explanation language is written in; a word in any other script (ㅗ, 오이, λύω in an English or French
# text) is the taught language and is protected like an inline example
LATIN = "A-Za-z\u00c0-\u024f\u1e00-\u1eff"
SRC_SCRIPT = {**{k: LATIN for k in ("en", "fr", "de", "es", "pt", "it", "nl", "pl", "cs", "fi", "hu", "tr", "is")},
              "ru": "\u0400-\u04ff", "uk": "\u0400-\u04ff", "mk": "\u0400-\u04ff", "el": "\u0370-\u03ff\u1f00-\u1fff",
              "ar": "\u0600-\u06ff", "ja": "\u3040-\u30ff\u4e00-\u9fff", "zh": "\u4e00-\u9fff", "ko": "\uac00-\ud7af\u1100-\u11ff\u3130-\u318f"}
_FOREIGN = {}


def protect_script(text: str, src: str, inline: list, gloss=None, info: dict | None = None) -> str:
    """runs of words in a script other than the explanation's become placeholders [n] (their text appended to inline)"""
    # a transcription in [ ] or / / with a sign outside plain ASCII letters is kept exactly ([mak̚tɯ], /ˈmakto/)
    # (an example placeholder inside it is put back, so the whole transcription becomes one placeholder)
    def ipa(m):
        whole = PH.sub(lambda p: inline[int(p.group(1)) - 1] if 0 < int(p.group(1)) <= len(inline) else p.group(0), m.group(0))
        inline.append(whole)
        return f"[{len(inline)}]"
    text = re.sub(r"\[(?!\d+\])(?:[^\[\]\s]|\[\d+\]){1,60}\]|/[^/\s]{1,40}/",
                  lambda m: ipa(m) if re.search(r"[^\x00-\x7f]", PH.sub("", m.group(0))) else m.group(0), text)
    # a bare IPA word (a letter of the IPA blocks or a combining mark: ˈʃtʊndə, maɪ̯nə) is kept whole, Latin letters too
    text = re.sub(r"(?:[^\s\[\]]|\[\d+\])*[\u0250-\u02ff\u0300-\u036f\u1d00-\u1dbf](?:[^\s\[\]]|\[\d+\])*",
                  lambda m: ipa(m) if re.search(r"[a-z]", PH.sub("", m.group(0))) else m.group(0), text) if SRC_SCRIPT.get(src) == LATIN else text
    # a quotation in the taught language inside the explanation (« Ich bin der Mann ») is an example
    taught = getattr(gloss, "taught", None) if PLAIN_EXAMPLES else None
    if taught:
        text = re.sub(r"«[^«»]{1,120}»|„[^„“”]{1,120}[“”]|\"[^\"]{1,120}\"",
                      lambda m: ipa(m) if taught(unescape(PH.sub(" ", m.group(0)))) else m.group(0), text)
        # words of the taught language written plainly in the explanation (English Wikibooks German: "Wie heißt du?")
        # are examples too: each run of them becomes one placeholder
        words = [m for m in re.finditer(r"(?<![\w'’])[^\W\d_]+(?![\w'’])", text) if taught(m.group(0))]
        groups = []
        for m in words:
            if groups and re.fullmatch(r"[ \-]+", text[groups[-1][1]:m.start()]):
                groups[-1][1] = m.end()
            else:
                groups.append([m.start(), m.end()])
        if groups and info is not None:
            info["plain"] = True
        for a, b in reversed(groups):
            inline.append(text[a:b])
            text = text[:a] + f"[{len(inline)}]" + text[b:]
        # (placeholders were given from the end: renumber them in reading order)
        order = [int(n) for n in PH.findall(text)]
        if order != sorted(order):
            first = len(inline) - len(groups)
            mine = sorted(n for n in order if n > first)
            remap = dict(zip(mine, sorted(mine, reverse=True)))
            text = PH.sub(lambda m: f"[{remap.get(int(m.group(1)), int(m.group(1)))}]", text)
            inline[first:] = inline[first:][::-1]
    if src in ("ja", "zh"):     # a Japanese or Chinese explanation quotes its examples in 「」 or 『』
        text = re.sub(r"[「『][^」』]{1,80}[」』]", ipa, text)
    own = SRC_SCRIPT.get(src)
    if not own:
        return text
    rx = _FOREIGN.get(src) or _FOREIGN.setdefault(src, re.compile(rf"(?:(?![{own}])[^\W\d_])+(?:[\s\-'’]+(?:(?![{own}])[^\W\d_])+)*"))

    def sub(m):
        inline.append(m.group(0))
        return f"[{len(inline)}]"
    return rx.sub(sub, text)


def crowded(text: str) -> bool:
    """a run that is mostly placeholders (kanbun with a ruby on every character) is the studied text, not prose"""
    n = len(PH.findall(text))
    return n > 12 and n * 2 > len(re.findall(r"[^\W\d_]", PH.sub(" ", text)))


GLOSSABLE = {"b", "strong", "i", "em"}
PLAIN_EXAMPLES = True     # unmarked words of the taught language are protected (off only to migrate older translations)


def segments(html: str, src: str = "en", gloss=None, label=None) -> list:
    """the page as a list of pieces: {"raw": html kept as is} or a prose run {"text": with placeholders, "inline":
    [html of each placeholder], "translate": bool}. gloss(text) -> bool, when given, tells a bold or italic word
    in the explanation language (Grimm Grammar bolds the English gloss of each example) from a form of the taught
    language: a gloss keeps only its tags as placeholders and is translated with its sentence. label(text) -> bool,
    when given, names short runs (a table's "Form", "Verb (negative)") that are translated although not prose."""
    p = _Tokens()
    p.feed(html)
    p.close()
    out, run, inline, depth, buf = [], [], [], 0, []

    def flush():
        nonlocal run, inline
        if not run:
            return
        info = {}
        text = protect_script("".join(run), src, inline, gloss, info)
        # a list line of forms with a gloss in brackets at its end ("backen (bäckt), backte, gebacken (to bake)"):
        # the forms are kept, the gloss alone is translated
        m = re.fullmatch(r"(.*?\S.*?)(\([^()]*\))(\s*)", text, re.S)
        if gloss and m and not is_prose(PH.sub(" ", m.group(1)), src) and re.search(r"[^\W\d_]", PH.sub("", m.group(1))) \
                and getattr(gloss, "taught", lambda t: not gloss(t))(unescape(re.sub(r"<[^>]+>", "", PH.sub(
                    lambda p: inline[int(p.group(1)) - 1] if 0 < int(p.group(1)) <= len(inline) else " ", m.group(1)))).strip()):
            inline.append(PH.sub(lambda p: inline[int(p.group(1)) - 1] if 0 < int(p.group(1)) <= len(inline) else p.group(0), m.group(1)))
            text = f"[{len(inline)}]" + m.group(2) + m.group(3)
        plain = PH.sub(" ", text)
        # with taught-language words made placeholders, a German sentence can look English ("Sie [1] an"): the run
        # must have been explanation before that, too
        before = not info.get("plain") or is_prose(PH.sub(" ", "".join(run)), src)
        known = bool(label) and not inline and label(unescape(text).strip())
        # a classical line is judged whole, its bolded key words put back (they carry the classical signs)
        whole = unescape(re.sub(r"<[^>]+>", "", PH.sub(lambda p: inline[int(p.group(1)) - 1] if 0 < int(p.group(1)) <= len(inline) else " ", text)))
        studied = src == "ja" and classical(whole)
        out.append({"text": text, "inline": inline, "translate": known or not studied and is_prose(plain, src) and before and not crowded(text)})
        run, inline = [], []

    in_table = 0
    open_tags = {}
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
                    words = buf[1:-1]
                    if gloss and tag in GLOSSABLE and words and not any("<" in w for w in words) and gloss(unescape("".join(words)).strip()):
                        inline.append(buf[0])
                        run.append(f"[{len(inline)}]")
                        run.extend(words)
                        inline.append(buf[-1])
                        run.append(f"[{len(inline)}]")
                    else:
                        inline.append("".join(buf))
                        run.append(f"[{len(inline)}]")
                    buf = []
            continue
        # a link or a plain span is prose: only its tags become placeholders, its text is translated
        if tag in TRANSPARENT and kind in ("start", "end") and not (kind == "start" and ("lang=" in raw or re.search(r'class="[^"]*\bIPA\b', raw))):
            if kind == "start" or open_tags.get(tag):
                open_tags[tag] = open_tags.get(tag, 0) + (1 if kind == "start" else -1)
                inline.append(raw)
                run.append(f"[{len(inline)}]")
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


def translate_html(html: str, translate, src: str = "en", gloss=None, label=None) -> str:
    """translate(list of strings) -> list of strings, the model call; returns the page with its prose in `src` (the
    book's explanation language) replaced"""
    segs = segments(html, src, gloss, label)
    todo = [s for s in segs if "text" in s and s["translate"]]
    # the model gets plain characters (&quot; → "), and its answer is escaped again for the page
    done = translate([unescape(s["text"].strip()) for s in todo]) if todo else []
    done = [t.replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;").replace('"', "&quot;") for t in done]
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
    # Portuguese: only what the model gets wrong (a placeholder hides a noun's gender, so the list stays short)
    "pt": {"fortis": "fortis", "lenis": "lenis"},
}
# the Japanese school grammar's terms, for a page explained in Japanese (MADLAD through English made 体言 "linguagem
# corporal", 終止形 "formulário de rescisão", 係り結び "nó associativo"; Allan's ja>pt check, 2026-10-21): the
# romanised term with a short gloss, as a learner meets it in Japanese books
JA_TERMS = {
    "pt": {"体言": "taigen (substantivo)", "用言": "yōgen (palavra flexionável)", "活用形": "forma de conjugação",
           "活用語尾": "terminação de conjugação", "活用": "conjugação", "連体形": "forma rentai (atributiva)",
           "連用形": "forma ren'yō (conjuntiva)", "終止形": "forma shūshi (conclusiva)", "未然形": "forma mizen (irrealis)",
           "已然形": "forma izen (realis)", "命令形": "forma imperativa", "仮定形": "forma hipotética",
           "謙譲語": "linguagem humilde (kenjōgo)", "尊敬語": "linguagem honorífica (sonkeigo)",
           "丁寧語": "linguagem polida (teineigo)", "敬語": "linguagem honorífica (keigo)", "助動詞": "verbo auxiliar",
           "格助詞": "partícula de caso", "係助詞": "partícula kakari (de realce)", "副助詞": "partícula adverbial",
           "接続助詞": "partícula conjuntiva", "終助詞": "partícula final", "助詞": "partícula", "送り仮名": "okurigana",
           "訓読み": "leitura kun", "音読み": "leitura on", "訓読": "kundoku (leitura do chinês clássico em japonês)",
           "返り点": "kaeriten (marcas de ordem de leitura)", "書き下し文": "kakikudashi (texto reescrito em japonês)",
           "書き下し": "kakikudashi", "白文": "hakubun (texto chinês sem marcas)", "係り結び": "kakari-musubi",
           "品詞": "classe de palavras", "自立語": "palavra independente", "付属語": "palavra dependente",
           "形容動詞": "adjetivo-verbo (keiyō dōshi)", "連体詞": "rentaishi (pré-nominal)", "接続詞": "conjunção",
           "感動詞": "interjeição", "再読文字": "caractere de dupla leitura (saidoku moji)",
           "置き字": "okiji (caractere não lido)", "枕詞": "makurakotoba (epíteto poético)",
           "掛詞": "kakekotoba (trocadilho poético)", "反語": "pergunta retórica (hango)", "打消": "negação", "推量": "conjectura"},
}
_TERM_RE = {}


def protect_terms(text: str, ui: str, src: str = "en") -> tuple:
    """the text with each known grammar term replaced by a placeholder [N] (numbered after any already there), and
    the target-language terms in placeholder order (the Japanese school terms when the page explains in Japanese)"""
    table = JA_TERMS.get(ui) if src == "ja" else TERMS.get(ui)
    if not table:
        return text, []
    key = src + ui if src == "ja" else ui
    edge = "" if src == "ja" else r"\b"
    rx = _TERM_RE.get(key) or _TERM_RE.setdefault(key, re.compile(edge + "(" + "|".join(sorted(map(re.escape, table), key=len, reverse=True)) + ")" + edge, re.I))
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
    half = len(out.strip()) // 2
    if half and out.strip()[:half] == out.strip()[half:]:          # said twice with no space between
        out = out.strip()[:half]
    sents = re.split(r"(?<=[.!?:;])\s+", out.strip())
    keep = [x for k, x in enumerate(sents) if k == 0 or x.strip(" .:;") != sents[k - 1].strip(" .:;")]
    out = " ".join(keep)
    words = out.split()
    for n in range(1, len(words) // 2 + 1):
        if [w.strip(".:;,") for w in words[:n]] == [w.strip(".:;,") for w in words[n:2 * n]] and len(src.split()) <= 6:
            out = " ".join(words[:n])
            break
    if src.strip() and src.strip()[-1] not in ".:;!?。！？：；" and out[-1:] in ".:;":
        out = out[:-1]
    return out.strip(" :") if not src.strip().endswith(":") else out
