"""Lessons from a Wikibooks language course (CC BY-SA 4.0; vendor/wikibooks/<Book>/pages.json, tools/fetch_wikibooks.py):
each page of the book's table of contents, in its order, as a lesson; maintenance boxes, navigation and stubs left
out; links point back to Wikibooks, where each page's history names its authors."""
from __future__ import annotations

import re
import urllib.parse


def _drop(html: str, pattern: str) -> str:
    """remove every element whose opening tag matches `pattern`, with its content (nesting of the same tag counted)"""
    out = html
    while True:
        m = re.search(pattern, out)
        if not m:
            return out
        tag = re.match(r"<(\w+)", m.group(0)).group(1)
        depth, i = 0, m.start()
        for t in re.finditer(rf"<(/?){tag}\b[^>]*>", out[m.start():]):
            depth += -1 if t.group(1) else 1
            if depth == 0:
                out = out[:m.start()] + out[m.start() + t.end():]
                break
        else:
            out = out[:m.start()]


# the language a Wikibooks edition is written in: (English name, Portuguese name, its own name)
EDITIONS = {"en": ("English", "inglês", "English"), "pt": ("Portuguese", "português", "Português"), "de": ("German", "alemão", "Deutsch"),
            "fr": ("French", "francês", "Français"), "es": ("Spanish", "espanhol", "Español"), "it": ("Italian", "italiano", "Italiano"),
            "nl": ("Dutch", "neerlandês", "Nederlands"), "pl": ("Polish", "polonês", "Polski"), "ru": ("Russian", "russo", "Русский"),
            "uk": ("Ukrainian", "ucraniano", "Українська"), "ar": ("Arabic", "árabe", "العربية"), "el": ("Greek", "grego", "Ελληνικά"),
            "la": ("Latin", "latim", "Latina"), "sa": ("Hindi", "híndi", "हिन्दी"), "mk": ("Macedonian", "macedônio", "Македонски"), "fi": ("Finnish", "finlandês", "Suomi"), "tr": ("Turkish", "turco", "Türkçe"),
            "cs": ("Czech", "tcheco", "Čeština"), "ja": ("Japanese", "japonês", "日本語"), "zh": ("Chinese", "chinês", "中文"),
            "ko": ("Korean", "coreano", "한국어"), "is": ("Icelandic", "islandês", "Íslenska")}


# notices about the page itself ("this module needs formatting"), in the editions imported; they carry the
# Wikibooks logo and often no class
MAINTENANCE = re.compile(r"Wikibooks-logo|Wikilivros-logo|precisa ser|needs to be|needs (?:work|cleanup)|muss überarbeitet|"
                         r"cette page|ce module|esta página|este módulo|questa pagina|questo modulo|deze pagina|ta strona", re.I)


def _drop_maintenance(html: str) -> str:
    """remove short tables that are notices about the page, not content"""
    out, pos = [], 0
    for m in re.finditer(r"<table\b[^>]*>.*?</table>", html, flags=re.S):
        text = re.sub(r"<[^>]+>", "", m.group(0))
        if len(text) < 600 and MAINTENANCE.search(m.group(0)) and "wikitable" not in m.group(0)[:200]:
            out.append(html[pos:m.start()]); pos = m.end()
    out.append(html[pos:])
    return "".join(out)


def clean(html: str, edition: str = "en", site: str = "wikibooks") -> str:
    h = re.sub(r"<style.*?</style>", "", html, flags=re.S)
    h = re.sub(r"<!--.*?-->", "", h, flags=re.S)
    for pat in (r'<table[^>]*class="[^"]*(ambox|navbox|metadata|noprint|toccolours)[^"]*"[^>]*>', r'<div[^>]*class="[^"]*(noprint|navbox|toc|printfooter|mw-references|ambox|thumb)[^"]*"[^>]*>',
                r'<div[^>]*role="navigation"[^>]*>', r'<div[^>]*id="headertemplate"[^>]*>', r'<div[^>]*class="[^"]*(wst-header|ws-noexport|licenseContainer)[^"]*"[^>]*>', r'<span[^>]*class="[^"]*mw-editsection[^"]*"[^>]*>'):
        h = _drop(h, pat)
    h = _drop_maintenance(h)
    h = re.sub(r"<img[^>]*>", "", h)
    h = re.sub(r'href="/wiki/', f'href="https://{edition}.{site}.org/wiki/', h)
    h = re.sub(r"<h[23]\b[^>]*>", "<h4>", h)
    h = re.sub(r"</h[23]>", "</h4>", h)
    return h.strip()


def _text_len(html: str) -> int:
    return len(re.sub(r"<[^>]+>|\s+", "", html))


def wikibooks_lessons(code: str, book: str, pages: list, index: dict, lessons: dict, questions: dict, levels: list | None = None,
                      rules: dict | None = None, edition: str = "en", prefix: str | None = None, site: str = "wikibooks",
                      group: str | None = None) -> int:
    """`site` wikisource: a public-domain book transcribed on Wikisource, credited as such"""
    levels = levels or [lv["id"] for lv in index["levels"]]
    topics = {lv["id"]: lv["topics"] for lv in index["levels"]}
    skip = re.compile(r"(print version|^contents$|restructuring|about|contribut|computing|authors|todo|sandbox|hover test)", re.I)
    keep = [(p["title"], clean(p["html"], edition, site)) for p in pages if not skip.search(p["title"].split("/")[-1])]
    keep = [(t, h) for t, h in keep if _text_len(h) >= 300]
    per = {}
    for k, (title, h) in enumerate(keep):
        lv = levels[min(len(levels) - 1, k * len(levels) // max(1, len(keep)))]
        lid = f"{prefix or code + '-wb'}-{k + 1}"
        parts = title.split("/")
        name = parts[-1]
        section = parts[-2] if len(parts) > 2 else book.replace("_", " ")
        url = f"https://{edition}.{site}.org/wiki/" + urllib.parse.quote(title.replace(" ", "_"), safe="/:")
        en_name, pt_name, own = EDITIONS.get(edition, (edition, edition, edition))
        written = "" if edition == "en" else f" It is written in {en_name}."
        if site == "wikiversity":
            credit = {"en": f'<p><small>From the Wikiversity course <a href="{url}">{title}</a> (CC BY-SA 4.0; authors in the page history).{written}</small></p>',
                      "pt": f'<p><small>Do curso da Wikiversidade <a href="{url}">{title}</a> (CC BY-SA 4.0; autores no histórico da página), em {pt_name}.</small></p>'}
            shelf = shelf_pt = f"Wikiversity ({own})"
        elif site == "wikisource":
            written = f" It is written in {en_name}."
            credit = {"en": f'<p><small>From <a href="{url}">{title}</a>, a public domain book transcribed on Wikisource.{written}</small></p>',
                      "pt": f'<p><small>De <a href="{url}">{title}</a>, livro em domínio público transcrito no Wikisource, em {pt_name}.</small></p>'}
            shelf = shelf_pt = f"Wikisource ({own})"
        else:
            credit = {"en": f'<p><small>From the Wikibooks course <a href="{url}">{title}</a> (CC BY-SA 4.0; authors in the page history).{written}</small></p>',
                      "pt": f'<p><small>Do curso do Wikilivros <a href="{url}">{title}</a> (CC BY-SA 4.0; autores no histórico da página), em {pt_name}.</small></p>'}
            shelf = "Wikibooks" if edition == "en" else f"Wikibooks ({own})"
            shelf_pt = "Wikilivros" if edition == "en" else f"Wikilivros ({own})"
        page = {"id": lid, "title": name, "meaning": {"en": section, "pt": section}, "intro": credit,
                "sections": [{"id": "wikibooks", "title": {"en": "The lesson", "pt": "A lição"}, "html": {"en": h, "pt": h}}],
                "examples": [], "practice": [], "level": lv, "topic": {"en": f"{shelf}: {section}", "pt": f"{shelf_pt}: {section}"},
                "source": f"Wikiversity ({edition}), {title} (CC BY-SA 4.0)" if site == "wikiversity" else f"Wikisource ({edition}), {title} (public domain)" if site == "wikisource" else f"Wikibooks{'' if edition == 'en' else f' ({edition})'}, {title} (CC BY-SA 4.0)"}
        rule = next((r for word, r in (rules or {}).items() if word in title.lower()), None)
        if rule:
            page["match"] = rule
        lessons[lid] = page
        questions.setdefault(lv, {})[lid] = {"pools": {"gap": []}, "qs": []}
        per.setdefault((lv, section), []).append({"id": lid, "title": name, "meaning": page["meaning"]})
    for (lv, section), entries in per.items():
        topics[lv].append({"id": f"{lv}-{prefix or 'wb'}-{section}", "kind": "grammar", "title": {"en": f"{shelf}: {section}", "pt": f"{shelf_pt}: {section}"}, "lessons": entries,
                           **({"group": group} if group else {})})
    return len(keep)
