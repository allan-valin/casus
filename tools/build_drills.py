#!/usr/bin/env python3
"""data/<code>/drills.json: the model words of the endings drill (Allan, 2026-10-18), each with its whole table.

usage: python3 tools/build_drills.py la|grc|de

The model words are the ones grammars teach the patterns with: one per declension and conjugation class.
A word missing from the dictionary is skipped. Tables come from data/<code>/paradigms (build_paradigms.py),
kept front-coded as they are there; the page decodes them with the same code as the dictionary."""
from __future__ import annotations

import json
import sys
from pathlib import Path

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
}
FREQ = {c: i for i, c in enumerate("ABCDEFX")}



def pick_models(models, lemmas: dict, rows_of) -> list[dict]:
    out = []
    for headword, pos, en, pt in models:
        ids = sorted((i for i, r in lemmas.items() if r.get("headword") == headword and r.get("pos") == pos and rows_of(i)),
                     key=lambda i: (FREQ.get(lemmas[i].get("freq", "X"), 9), int(i)))
        if not ids:
            continue
        i = ids[0]
        r = lemmas[i]
        out.append({"id": i, "headword": headword, "dict_form": r.get("dict_form", headword), "pos": pos,
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

    out = pick_models(MODELS[code], lemmas, rows_of)
    (root / "drills.json").write_text(json.dumps(out, ensure_ascii=False, separators=(",", ":")), encoding="utf-8")
    missing = [h for h, p, *_ in MODELS[code] if not any(m["headword"] == h and m["pos"] == p for m in out)]
    print(f"{code}: {len(out)} model words, {(root / 'drills.json').stat().st_size // 1024} KB" + (f"; not found: {', '.join(missing)}" if missing else ""))


if __name__ == "__main__":
    main(sys.argv[1])
