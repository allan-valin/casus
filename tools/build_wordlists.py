#!/usr/bin/env python3
"""Raw word lists for the phrase and frequency drills (Allan, 2026-10-18); tools/build_wordlists.mjs finishes them.

usage: python3 tools/build_wordlists.py la|grc|de   -> vendor/wordlists/<code>/phrases.raw.json, frequency.raw.json
(build inputs, not published; tools/build_wordlists.mjs writes the finished lists into data/<code>/)

Phrases: multi-word Wiktionary entries (wiktextract dump, CC BY-SA) that are proverbs, idioms, or set phrases,
with their meaning. Left out: single words, cross-references ("synonym of", "form of"), entries whose meaning
just repeats them, names, and vulgar or offensive senses.
Frequency: Latin and Greek from the Dickinson College Commentaries core vocabularies (CC BY-SA; ~1000 Latin,
~500 Greek lemmas ranked by frequency); German from the FrequencyWords OpenSubtitles list (hermitdave, CC BY-SA
4.0), word forms the .mjs step turns into dictionary words."""
from __future__ import annotations

import html as htmllib
import json
import re
import sys
import urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(Path(__file__).resolve().parent))
DUMPS = {"la": "Latin", "grc": "AncientGreek", "de": "German", "ja": "Japanese", "ar": "Arabic", "ru": "Russian", "ko": "Korean", "zh": "Chinese"}
CORE = {"la": "https://dcc.dickinson.edu/latin-core-list1", "grc": "https://dcc.dickinson.edu/greek-core-list"}
# Japanese: the JLPT N5 and N4 vocabularies (open-anki-jlpt-decks, MIT; after Jonathan Waller's JLPT lists)
JLPT = [("N5", "https://raw.githubusercontent.com/jamsinclair/open-anki-jlpt-decks/main/src/n5.csv"),
        ("N4", "https://raw.githubusercontent.com/jamsinclair/open-anki-jlpt-decks/main/src/n4.csv")]
SUBTITLE_FREQ = {code: f"https://raw.githubusercontent.com/hermitdave/FrequencyWords/master/content/2018/{code}/{code}_50k.txt"
                 for code in ("de", "ar", "ru", "ko", "mk")}
SUBTITLE_FREQ["zh"] = "https://raw.githubusercontent.com/hermitdave/FrequencyWords/master/content/2018/zh_cn/zh_cn_50k.txt"
SKIP_TAGS = {"vulgar", "offensive", "derogatory", "ethnic", "slur"}
XREF = re.compile(r"^(synonym|alternative (form|spelling)|[\w-]+ form|abbreviation|misspelling|obsolete form|archaic form|initialism|contraction) of\b", re.I)


def phrase_item(d: dict) -> dict | None:
    word = (d.get("word") or "").strip()
    pos = d.get("pos")
    japanese = bool(re.search(r"[\u3040-\u30ff\u3400-\u9fff]", word))
    # a phrase is several words: spaced in most languages; Japanese writes none, so three characters will do
    if (" " not in word and not (japanese and len(word) >= 3)) or pos == "name":
        return None
    senses = d.get("senses") or []
    tags = {t for s in senses for t in (s.get("tags") or [])}
    if tags & SKIP_TAGS:
        return None
    cats = {(c.get("name", "") if isinstance(c, dict) else str(c)).lower() for s in senses for c in (s.get("categories") or [])}
    if pos == "proverb":
        kind = "proverb"
    elif "idiomatic" in tags or any("idioms" in c for c in cats):
        kind = "idiom"
    elif pos == "phrase":
        kind = "phrase"
    else:
        return None
    # the meaning is the first sense that is not the literal reading (memento mori: "Do not forget that you are only
    # human", not "Be mindful of dying"); the literal sense and any further senses are kept beside it
    usable = [(set(x.get("tags") or []), g.strip()) for x in senses if not (set(x.get("tags") or []) & SKIP_TAGS)
              for g in (x.get("glosses") or [])[:1] if g.strip() and not XREF.match(g.strip())]
    literal = next((g for tags, g in usable if "literally" in tags), "")
    real = [g for tags, g in usable if "literally" not in tags]
    gloss = real[0] if real else literal
    if not gloss or gloss.lower().strip(" .!?") == word.lower().strip(" .!?"):
        return None
    item = {"p": word, "kind": kind, "en": gloss[:160]}
    # Chinese: the pinyin from the Mandarin pronunciation
    if re.search(r"[\u3400-\u9fff]", word) and not re.search(r"[\u3040-\u30ff]", word):
        from casus_build.zh.parse import pinyin_of
        if pinyin_of(d):
            item["reading"] = pinyin_of(d)
    # Japanese: the reading from the head line's ruby, for furigana and romaji
    if re.search(r"[\u3040-\u30ff\u3400-\u9fff]", word) and "reading" not in item:
        from casus_build.ja.parse import furigana
        heads = d.get("head_templates") or []
        if heads and heads[0].get("expansion"):
            reading = "".join(r or t for t, r in furigana(heads[0]["expansion"]))
            if reading and reading != word and re.fullmatch(r"[\u3040-\u30ff\u30fc\s]+", reading):
                item["reading"] = reading
    if literal and literal != gloss:
        item["literally"] = literal[:160]
    more = [g[:160] for g in real[1:3] if g != gloss]
    if more:
        item["more"] = more
    return item


WIKI = "https://en.wikipedia.org/api/rest_v1/page/summary/"


def _bare(text: str) -> str:
    import unicodedata
    d = unicodedata.normalize("NFD", text.lower())
    return re.sub(r"[^\w ]", "", "".join(c for c in d if not unicodedata.combining(c)))


def wiki_note(phrase: str, summary: dict | None) -> dict | None:
    """the first two sentences of an English Wikipedia article (CC BY-SA), only when the article is about the
    phrase: a standard page whose title or opening contains it"""
    if not summary or summary.get("type") != "standard":
        return None
    text = (summary.get("extract") or "").strip()
    if _bare(phrase) not in _bare(summary.get("title", "")) and _bare(phrase) not in _bare(text[:200]):
        return None
    sentences = re.split(r"(?<=[.!?])\s+(?=[A-Z\u0391-\u03a9])", text)
    note = " ".join(sentences[:2]).strip()
    return {"title": summary.get("title"), "text": note[:420]} if note else None


def wiki_notes(phrases: list[dict], cache_path: Path) -> None:
    """adds p["wiki"] where English Wikipedia has an article about the phrase; answers are cached on disk, so a
    rebuild asks Wikipedia only for new phrases (one request a second, backing off when asked)"""
    import time
    import urllib.parse
    cache = json.loads(cache_path.read_text(encoding="utf-8")) if cache_path.exists() else {}
    for p in phrases:
        key = p["p"]
        if key not in cache:
            title = key[:1].upper() + key[1:]
            import urllib.error
            for attempt in range(4):
                try:
                    cache[key] = json.loads(fetch(WIKI + urllib.parse.quote(title.replace(" ", "_"), safe="")))
                    break
                except urllib.error.HTTPError as e:
                    if e.code == 404:                                  # no article: remembered
                        cache[key] = None
                        break
                    time.sleep(5 * (attempt + 1))                      # 429 / 5xx: back off, never cache
                except Exception:
                    time.sleep(5 * (attempt + 1))
            time.sleep(1.0)                                            # Wikimedia asks for gentle clients
            if len(cache) % 20 == 0:
                cache_path.write_text(json.dumps(cache, ensure_ascii=False), encoding="utf-8")   # progress survives a stop
        note = wiki_note(key, cache.get(key))                        # still unknown after retries: no note this time
        if note:
            p["wiki"] = note
    cache_path.write_text(json.dumps(cache, ensure_ascii=False), encoding="utf-8")


def parse_jlpt_csv(text: str, level: str, start: int) -> list[dict]:
    import csv
    import io
    out = []
    for row in csv.DictReader(io.StringIO(text)):
        w, r = (row.get("expression") or "").strip(), (row.get("reading") or "").strip()
        if not w:
            continue
        item = {"w": w, "reading": r, "en": (row.get("meaning") or "").strip(), "level": level, "rank": start + len(out) + 1}
        if not r or r == w:
            item.pop("reading")
        out.append(item)
    return out


def parse_core_rows(page: str) -> list[dict]:
    out = []
    for row in re.findall(r"<tr[^>]*>(.*?)</tr>", page, re.S):
        cells = [htmllib.unescape(re.sub(r"<[^>]+>", "", c)).strip() for c in re.findall(r"<td[^>]*>(.*?)</td>", row, re.S)]
        if len(cells) >= 5 and cells[4].isdigit():
            out.append({"w": re.sub(r"\s+", " ", cells[0]), "en": re.sub(r"\s+", " ", cells[1]), "pos": cells[2], "rank": int(cells[4])})
    return sorted(out, key=lambda r: r["rank"])


def fetch(url: str) -> str:
    req = urllib.request.Request(url, headers={"User-Agent": "casus-build/1.0 (https://github.com/allan-valin/casus)"})
    with urllib.request.urlopen(req, timeout=60) as r:
        return r.read().decode("utf-8")


def main(code: str) -> None:
    out_dir = ROOT / "vendor" / "wordlists" / code
    out_dir.mkdir(parents=True, exist_ok=True)
    phrases, seen = [], set()
    with open(ROOT / "vendor" / "wiktextract" / f"kaikki.org-dictionary-{DUMPS[code]}.jsonl", encoding="utf-8") as f:
        for line in f:
            item = phrase_item(json.loads(line))
            if item and item["p"] not in seen:
                seen.add(item["p"])
                phrases.append(item)
    # explanations written for Casus where no article explains a saying (tools/casus_build/notes.py)
    from casus_build.notes import NOTES
    for p in phrases:
        if NOTES.get(code, {}).get(p["p"]):
            p["note"] = NOTES[code][p["p"]]
    # Latin and Greek sayings, and German proverbs, are often explained on English Wikipedia (memento mori)
    # German and Chinese have thousands of phrases: only their proverbs are looked up
    wiki_notes([p for p in phrases if code not in ("de", "zh") or p["kind"] == "proverb"], out_dir / "wiki.cache.json")
    print(f"{code}: {sum(1 for p in phrases if p.get('wiki'))} phrases with a Wikipedia note")
    (out_dir / "phrases.raw.json").write_text(json.dumps(phrases, ensure_ascii=False), encoding="utf-8")
    if code == "ja":
        freq = []
        for level, url in JLPT:
            freq += parse_jlpt_csv(fetch(url), level, len(freq))
    elif code in CORE:
        freq = parse_core_rows(fetch(CORE[code]))
    else:
        freq = [{"form": w, "n": int(n)} for w, n in (l.split() for l in fetch(SUBTITLE_FREQ[code]).splitlines()[:8000] if len(l.split()) == 2)]
    (out_dir / "frequency.raw.json").write_text(json.dumps(freq, ensure_ascii=False), encoding="utf-8")
    counts = ", ".join(f"{k} {sum(1 for p in phrases if p['kind'] == k)}" for k in ("phrase", "idiom", "proverb"))
    print(f"{code}: {len(phrases)} phrases ({counts}), {len(freq)} frequency rows")


if __name__ == "__main__":
    main(sys.argv[1])
