#!/usr/bin/env python3
"""data/<code>/drills.json: the model words of the endings drill (Allan, 2026-10-18), each with its whole table.

usage: python3 tools/build_drills.py la|grc|de

The model words are the ones grammars teach the patterns with: one per declension and conjugation class.
A word missing from the dictionary is skipped. Tables come from data/<code>/paradigms (build_paradigms.py),
kept front-coded as they are there; the page decodes them with the same code as the dictionary."""
from __future__ import annotations

import json
import os
import re
import sys
import unicodedata
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))

# (headword, part of speech, English gloss, Brazilian Portuguese gloss): model words are chosen, so are their glosses
MODELS = {
    "la": [("rosa", "noun", "rose", "rosa"), ("dominus", "noun", "master, lord", "senhor"), ("puer", "noun", "boy", "menino"),
           ("ager", "noun", "field", "campo"), ("bellum", "noun", "war", "guerra"), ("rex", "noun", "king", "rei"),
           ("corpus", "noun", "body", "corpo"), ("ciuis", "noun", "citizen", "cidadão"), ("mare", "noun", "sea", "mar"),
           ("manus", "noun", "hand", "mão"), ("cornu", "noun", "horn", "chifre"), ("res", "noun", "thing, matter", "coisa"),
           ("dies", "noun", "day", "dia"), ("bonus", "adj", "good", "bom"), ("fortis", "adj", "strong, brave", "forte"),
           ("ego", "pron", "I", "eu"), ("hic", "pron", "this", "este"), ("qui", "pron", "who, which", "que, o qual"),
           ("amo", "verb", "to love", "amar"), ("moneo", "verb", "to warn", "advertir"), ("rego", "verb", "to rule", "reger"),
           ("capio", "verb", "to take", "tomar"), ("audio", "verb", "to hear", "ouvir"), ("sum", "verb", "to be", "ser, estar"),
           ("eo", "verb", "to go", "ir"), ("uolo", "verb", "to want", "querer"), ("fero", "verb", "to carry", "levar")],
    "grc": [("χώρα", "noun", "land, country", "terra, país"), ("θάλασσα", "noun", "sea", "mar"), ("ψυχή", "noun", "soul", "alma"),
            ("νεανίας", "noun", "young man", "jovem"), ("λόγος", "noun", "word, speech", "palavra, discurso"),
            ("δῶρον", "noun", "gift", "presente"), ("πόλις", "noun", "city", "cidade"), ("βασιλεύς", "noun", "king", "rei"),
            ("σῶμα", "noun", "body", "corpo"), ("φύλαξ", "noun", "guard", "guarda"), ("ἀγαθός", "adj", "good", "bom"),
            ("ὁ", "det", "the", "o, a"), ("λύω", "verb", "to loosen", "soltar"), ("εἰμί", "verb", "to be", "ser, estar"),
            ("τιμάω", "verb", "to honour", "honrar"), ("ποιέω", "verb", "to make, to do", "fazer"), ("δίδωμι", "verb", "to give", "dar")],
    "de": [("der", "det", "the", "o, a"), ("ein", "det", "a, an", "um, uma"), ("Mann", "noun", "man", "homem"),
           ("Frau", "noun", "woman", "mulher"), ("Kind", "noun", "child", "criança"), ("Hund", "noun", "dog", "cachorro"),
           ("Haus", "noun", "house", "casa"), ("Junge", "noun", "boy", "menino"), ("Name", "noun", "name", "nome"),
           ("Auto", "noun", "car", "carro"), ("Tag", "noun", "day", "dia"), ("Mutter", "noun", "mother", "mãe"),
           ("ich", "pron", "I", "eu"), ("er", "pron", "he", "ele"), ("sein", "verb", "to be", "ser, estar"),
           ("haben", "verb", "to have", "ter"), ("werden", "verb", "to become", "tornar-se"), ("machen", "verb", "to make, to do", "fazer"),
           ("gehen", "verb", "to go", "ir"), ("kommen", "verb", "to come", "vir"), ("sprechen", "verb", "to speak", "falar"),
           ("können", "verb", "can, to be able", "poder")],
    "ar": [("كتاب", "noun", "book", "livro"), ("مدرسة", "noun", "school", "escola"), ("معلم", "noun", "teacher", "professor"),
           ("بيت", "noun", "house", "casa"), ("كبير", "adj", "big", "grande"), ("جميل", "adj", "beautiful", "bonito"),
           ("كتب", "verb", "to write", "escrever"), ("قال", "verb", "to say", "dizer"), ("ذهب", "verb", "to go", "ir"),
           ("درس", "verb", "to study", "estudar"), ("رأى", "verb", "to see", "ver")],
    "ru": [("стол", "noun", "table", "mesa"), ("книга", "noun", "book", "livro"), ("окно", "noun", "window", "janela"),
           ("словарь", "noun", "dictionary", "dicionário"), ("тетрадь", "noun", "notebook", "caderno"), ("время", "noun", "time", "tempo"),
           ("новый", "adj", "new", "novo"), ("хороший", "adj", "good", "bom"), ("большой", "adj", "big", "grande"),
           ("читать", "verb", "to read", "ler"), ("говорить", "verb", "to speak", "falar"), ("писать", "verb", "to write", "escrever"),
           ("жить", "verb", "to live", "viver"), ("быть", "verb", "to be", "ser, estar"), ("идти", "verb", "to go (on foot)", "ir (a pé)"),
           ("я", "pron", "I", "eu"), ("он", "pron", "he", "ele"), ("этот", "det", "this", "este")],
    "ko": [("좋다", "adj", "to be good", "ser bom"), ("크다", "adj", "to be big", "ser grande"), ("작다", "adj", "to be small", "ser pequeno"),
           ("가다", "verb", "to go", "ir"), ("먹다", "verb", "to eat", "comer"), ("하다", "verb", "to do", "fazer"), ("보다", "verb", "to see", "ver"),
           ("읽다", "verb", "to read", "ler"), ("듣다", "verb", "to listen", "ouvir"), ("살다", "verb", "to live", "viver")],
    "ja": [("高い", "adj", "high, expensive", "alto, caro"), ("いい", "adj", "good", "bom"), ("綺麗", "adj", "pretty, clean", "bonito, limpo"),
           ("食べる", "verb", "to eat", "comer"), ("書く", "verb", "to write", "escrever"), ("泳ぐ", "verb", "to swim", "nadar"),
           ("話す", "verb", "to speak", "falar"), ("待つ", "verb", "to wait", "esperar"), ("死ぬ", "verb", "to die", "morrer"),
           ("遊ぶ", "verb", "to play", "brincar, jogar"), ("読む", "verb", "to read", "ler"), ("帰る", "verb", "to go home", "voltar para casa"),
           ("買う", "verb", "to buy", "comprar"), ("行く", "verb", "to go", "ir"), ("する", "verb", "to do", "fazer"), ("来る", "verb", "to come", "vir")],
}
FREQ = {c: i for i, c in enumerate("ABCDEFX")}
XREF = re.compile(r"^(synonym|alternative (form|spelling)|[\w-]+ form|abbreviation|initialism|misspelling|obsolete (form|spelling)|contraction) of\b", re.I)
# models whose tables no other word follows: learnt by heart, so "random word" is off for them
IRREGULAR = {"la": {"sum", "eo", "uolo", "fero", "ego", "hic", "qui"}, "grc": {"εἰμί", "ὁ", "δίδωμι"},
             "de": {"der", "ein", "ich", "er", "sein", "haben", "werden", "können"},
             "ja": {"いい", "行く", "する", "来る"}, "ar": {"رأى"},
             "ru": {"время", "быть", "идти", "я", "он", "этот"}, "ko": {"하다", "듣다", "살다"}}
POOL = 60


def decode(rows: list) -> list:
    """mirror of src/app/lib/paradigm.js frontDecode; a Japanese "~reading" is not a code and is left out"""
    out, prev = [], None
    for row in rows:
        if prev is None or not isinstance(row[0], int):
            form, codes = row[0], row[1:]
        else:
            form, codes = prev[: row[0]] + row[1], row[2:]
        codes = [c for c in codes if not str(c).startswith("~")]
        out.append([form, *codes])
        prev = form
    return out


def _plain(form: str) -> str:
    d = unicodedata.normalize("NFD", form.lower())
    # accents and breathings go; the kana voicing marks ゛゜ (U+3099, U+309A) are letters, not accents
    # (Arabic vowel marks go too: kept, they change in every cell and the prefix comparison breaks; tried
    # 2026-10-19 — كتاب matched حلال instead of حجاب/شهاب, its own broken-plural pattern)
    return unicodedata.normalize("NFC", "".join(c for c in d if not unicodedata.combining(c) or c in "\u3099\u309a")).replace("ς", "σ")


def signature(rows: list) -> frozenset:
    """the table's endings after the stem all its forms share, cell by cell: two words with the same signature
    decline or conjugate alike (accents and breathings ignored, so Greek accent shifts do not count)"""
    forms = [(_plain(r[0]), r[1:]) for r in decode(rows)]
    stem = os.path.commonprefix([f for f, _ in forms])
    return frozenset((code, f[len(stem):]) for f, codes in forms for code in codes)


def core_endings(rows: list, headword: str, used: dict | None = None, lead_drop: int = 2) -> dict:
    """code -> set of endings, over the cells whose form keeps the headword's stem (an augmented Greek past or an
    irregular perfect does not, and is left out); the stem is what those forms share. Accents, breathings and
    umlauts are ignored (Mann/Männer declines like Wald/Wälder)."""
    hw = _plain(headword)
    lead = hw[: max(1 if lead_drop == 1 else 2, len(hw) - lead_drop)]          # Japanese: 書く → 書
    forms = [(_plain(r[0]), r[1:]) for r in decode(rows)]
    core = [(f, codes) for f, codes in forms if f.startswith(lead)]
    if not core:
        return {}
    # each form as a change of the headword: letters dropped from its end, letters added (rosa→rosae: 0, e;
    # rex→regis: 1, gis); comparable across words whatever their stems (Junge/Jungs vs Kollege/Kollegen)
    def change(f):
        keep = len(os.path.commonprefix([f, hw]))
        return (len(hw) - keep, f[keep:])
    out: dict = {}
    seen: dict = {}
    for f, codes in core:
        for code in codes:
            out.setdefault(code, set()).add(change(f))
            seen.setdefault(code, []).append(f)
    # where a cell has several forms and usage data knows some of them, keep the most used one (Mann: Männer,
    # not the rare Mannen) — a model's table is matched by its everyday forms
    if used:
        used = {_plain(k): v for k, v in used.items()}
        for code, fs in seen.items():
            # the headword spelling counts for its own cells only: Mann as a plural (drei Mann) is rare even though
            # "mann" is frequent
            plural = len(code) > 2 and code[0] in "na" and code[2] == "p"            # noun/adj codes: pos, case, number…
            counts = {f: (0 if f == hw and plural and len(set(fs)) > 1 else used.get(f, 0)) for f in fs}
            if len(set(fs)) > 1 and max(counts.values()) > 0:
                top = max(counts, key=counts.get)
                out[code] = {change(top)}
    return out


def same_table(model: dict, other: dict, share: float = 0.85) -> bool:
    """other follows model's table: it has nearly all of model's cells, and nearly all of them end alike
    (a rare extra form in either dictionary entry does not break the match)"""
    if not model or not other:
        return False
    agree = sum(1 for code, ends in model.items() if ends & other.get(code, set()))
    return agree >= share * len(model) and len(other) <= len(model) / share


def _short(text: str) -> str:
    first = (text or "").split(";")[0]
    while re.search(r"\([^()]*\)", first):
        first = re.sub(r"\([^()]*\)", "", first)
    first = " ".join(first.split())
    return first if len(first) <= 40 else first[:38].rstrip() + "…"


def pools(models, lemmas: dict, rows_of, glosses: dict, irregular=frozenset(), rank=None, capitalised_nouns=False, used=None, lead_drop=2, verb_share=0.85) -> dict:
    """model id -> [[lemma id, dict form, short meaning]…]: other words with exactly the model's table, the most
    frequent first (Whitaker's frequency letter, or a rank from the frequency list), at most POOL"""
    rank = rank or {}
    wanted = {m["pos"] for m in models if m["headword"] not in irregular and m.get("irregular_key") not in irregular}
    tables: dict = {}
    for i, r in lemmas.items():
        h = r.get("headword", "")
        if r.get("pos") not in wanted or not glosses.get(i) or h in irregular:
            continue
        # no names (capitalised, except German nouns), abbreviations, numbers, or entries that only point elsewhere
        name = glosses[i][:1].isupper() and _plain(glosses[i]).startswith(_plain(h))            # Ambiorix, a chief…
        if (h[:1].isupper() and not capitalised_nouns) or name or (len(h) > 1 and h.isupper()) or any(ch.isdigit() for ch in h) or XREF.match(glosses[i]):
            continue
        rows = rows_of(i)
        if rows:
            tables[i] = (r["pos"], core_endings(rows, r["headword"], lead_drop=lead_drop))
    out = {}
    for m in models:
        if m["headword"] in irregular or m.get("irregular_key") in irregular:
            out[m["id"]] = []
            continue
        mine = core_endings(rows_of(m["id"]), m["headword"], used, lead_drop=lead_drop)
        # a noun or adjective table is small: every cell must end alike; a verb table may differ in a few
        share = verb_share if m["pos"] == "verb" else 1.0
        same = [i for i, (pos, t) in tables.items() if pos == m["pos"] and i != m["id"] and same_table(mine, t, share)]
        if not same and used:                      # the everyday form fits nothing (Jungs): match the dictionary's table
            mine = core_endings(rows_of(m["id"]), m["headword"], lead_drop=lead_drop)
            same = [i for i, (pos, t) in tables.items() if pos == m["pos"] and i != m["id"] and same_table(mine, t, share)]
        same.sort(key=lambda i: (rank.get(lemmas[i].get("dict_form"), rank.get(_plain(lemmas[i]["headword"]), rank.get(lemmas[i]["headword"], 10**6))),
                                 FREQ.get(lemmas[i].get("freq", "X"), 9), int(i)))
        out[m["id"]] = [[i, lemmas[i].get("dict_form", lemmas[i]["headword"]), _short(glosses[i])] for i in same[:POOL]]
    return out



def pick_models(models, lemmas: dict, rows_of, key=lambda w: w) -> list[dict]:
    """key: how a headword is compared (Arabic: by its bare letters, the dictionary's are vowelled)"""
    out = []
    for headword, pos, en, pt in models:
        ids = sorted((i for i, r in lemmas.items() if key(r.get("headword") or "") == key(headword) and r.get("pos") == pos and rows_of(i)),
                     key=lambda i: ("(form I)" not in lemmas[i].get("dict_form", "(form I)"), FREQ.get(lemmas[i].get("freq", "X"), 9), int(i)))
        if not ids:
            continue
        i = ids[0]
        r = lemmas[i]
        out.append({"id": i, "headword": r.get("headword", headword), "dict_form": r.get("dict_form", headword), "pos": pos,
                    "gloss": {"en": en, "pt": pt}, "rows": rows_of(i)})
    return out


def main(code: str) -> None:
    root = Path(__file__).resolve().parents[1] / "data" / code
    lemmas = json.loads((root / "lemmas.json").read_text(encoding="utf-8"))
    buckets: dict[int, dict] = {}

    def rows_of(i: str):
        n = int(i) % 512
        if n not in buckets:
            p = root / "paradigms" / f"{n}.json"
            buckets[n] = json.loads(p.read_text(encoding="utf-8")) if p.exists() else {}
        return buckets[n].get(i)

    if code == "ru":
        from casus_build.ru.normalize import strip_ru
        out = pick_models(MODELS[code], lemmas, rows_of, key=strip_ru)
        bare = {strip_ru(h): h for h, *_ in MODELS[code]}
        for m in out:
            m["irregular_key"] = bare.get(strip_ru(m["headword"]))
    elif code == "ar":
        from casus_build.ar.normalize import strip_ar
        out = pick_models(MODELS[code], lemmas, rows_of, key=strip_ar)
        bare = {strip_ar(h): h for h, *_ in MODELS[code]}
        for m in out:
            m["irregular_key"] = bare.get(strip_ar(m["headword"]))      # the model's name as listed (رأى)
    else:
        out = pick_models(MODELS[code], lemmas, rows_of)
    glosses = json.loads((root / "glosses.en.json").read_text(encoding="utf-8"))
    freq_file = root / "frequency.json"
    rank = {}
    if freq_file.exists():
        for f in json.loads(freq_file.read_text(encoding="utf-8")):
            for w in [f["w"], *re.split(r"[ ,]+", f["w"])[:1]]:
                rank.setdefault(w, f["rank"])
                rank.setdefault(_plain(w).replace("v", "u").replace("j", "i") if code == "la" else _plain(w), f["rank"])   # amō → amo
    raw = root.parent.parent / "vendor" / "wordlists" / code / "frequency.raw.json"
    used = {_plain(r["form"]): r["n"] for r in json.loads(raw.read_text(encoding="utf-8")) if "form" in r} if raw.exists() else {}
    for n in range(512):
        rows_of(str(n))                                   # load every bucket once, so the pools can look anywhere
    by_model = pools(out, lemmas, rows_of, glosses, IRREGULAR[code], rank, capitalised_nouns=(code == "de"), used=used,
                     # Japanese: short headwords (書く) keep one character of stem; generated forms match exactly
                     lead_drop=1 if code == "ja" else 2, verb_share=1.0 if code == "ja" else 0.85)   # German nouns are capitalised
    for m in out:
        m["irregular"] = m["headword"] in IRREGULAR[code] or m.get("irregular_key") in IRREGULAR[code]
        m.pop("irregular_key", None)
        m["pool"] = by_model[m["id"]]
    (root / "drills.json").write_text(json.dumps(out, ensure_ascii=False, separators=(",", ":")), encoding="utf-8")
    from casus_build.ar.normalize import strip_ar
    from casus_build.ru.normalize import strip_ru
    bare_of = {"ar": strip_ar, "ru": strip_ru}.get(code, lambda w: w)
    missing = [h for h, p, *_ in MODELS[code] if not any(m["pos"] == p and bare_of(m["headword"]) == bare_of(h) for m in out)]
    print(f"{code}: pools " + ", ".join(f"{m['headword']} {len(m['pool'])}" for m in out))
    print(f"{code}: {len(out)} model words, {(root / 'drills.json').stat().st_size // 1024} KB" + (f"; not found: {', '.join(missing)}" if missing else ""))


if __name__ == "__main__":
    main(sys.argv[1])
