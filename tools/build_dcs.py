#!/usr/bin/env python3
"""Sanskrit sentences for Learn from the Digital Corpus of Sanskrit (Oliver Hellwig, CC BY 4.0; vendor/dcs-src, a
sparse clone of github.com/OliverHellwig/sanskrit): each sentence in its padapāṭha form — the words as they are
before sandhi, which the DCS annotators give for every word — with compound members joined back into one word, in
Devanagari. Learners see the words cleanly separated (as beginners' readers print them); the Casus reader analyses
them. Writes vendor/corpora/sa/<text>.txt, one sentence a line. Usage: build_dcs.py [max words per sentence]"""
from __future__ import annotations

import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
TEXTS = ["Hitopadeśa", "Vetālapañcaviṃśatikā", "Śukasaptati", "Kathāsaritsāgara", "Rāmāyaṇa"]

VOWELS = {"a": ("अ", ""), "ā": ("आ", "ा"), "i": ("इ", "ि"), "ī": ("ई", "ी"), "u": ("उ", "ु"), "ū": ("ऊ", "ू"),
          "ṛ": ("ऋ", "ृ"), "ṝ": ("ॠ", "ॄ"), "ḷ": ("ऌ", "ॢ"), "e": ("ए", "े"), "ai": ("ऐ", "ै"), "o": ("ओ", "ो"), "au": ("औ", "ौ")}
CONS = {"kh": "ख", "gh": "घ", "ch": "छ", "jh": "झ", "ṭh": "ठ", "ḍh": "ढ", "th": "थ", "dh": "ध", "ph": "फ", "bh": "भ",
        "k": "क", "g": "ग", "ṅ": "ङ", "c": "च", "j": "ज", "ñ": "ञ", "ṭ": "ट", "ḍ": "ड", "ṇ": "ण", "t": "त", "d": "द", "n": "न",
        "p": "प", "b": "ब", "m": "म", "y": "य", "r": "र", "l": "ल", "v": "व", "ś": "श", "ṣ": "ष", "s": "स", "h": "ह"}
OTHER = {"ṃ": "ं", "ṁ": "ं", "ḥ": "ः", "'": "ऽ"}
VIRAMA = "्"
TOKENS = sorted([*VOWELS, *CONS, *OTHER], key=len, reverse=True)


def iast_to_deva(word: str) -> str:
    out, i, after_cons = [], 0, False
    w = word.lower()
    while i < len(w):
        tok = next((t for t in TOKENS if w.startswith(t, i)), None)
        if tok is None:
            if after_cons:
                out.append(VIRAMA)
            out.append(w[i]); i += 1; after_cons = False
            continue
        if tok in CONS:
            if after_cons:
                out.append(VIRAMA)
            out.append(CONS[tok]); after_cons = True
        elif tok in VOWELS:
            out.append(VOWELS[tok][1] if after_cons else VOWELS[tok][0]); after_cons = False
        else:
            if after_cons:
                out.append(VIRAMA)
            out.append(OTHER[tok]); after_cons = False
        i += len(tok)
    if after_cons:
        out.append(VIRAMA)
    return "".join(out)


def sentences_of(conllu: str, max_words: int = 99, compounds: bool = True) -> list[str]:
    """compounds=False: only sentences without any (the reader would split a long compound wrongly)"""
    out = []
    for block in conllu.strip().split("\n\n"):
        words, pending, has_cpd = [], "", False
        for line in block.split("\n"):
            cols = line.split("\t")
            if line.startswith("#") or len(cols) < 10 or "-" in cols[0] or not cols[0].isdigit():
                continue
            misc = dict(kv.split("=", 1) for kv in cols[9].split("|") if "=" in kv)
            form = misc.get("Unsandhied") or cols[1]
            if cols[3] == "PUNCT" or not re.search(r"\w", form):
                continue
            # compound members (Case=Cpd) join the next word: jāhnavī + phena + lekhā → jāhnavīphenalekhā
            if "Case=Cpd" in cols[5]:
                pending += form
                has_cpd = True
                continue
            words.append(pending + form)
            pending = ""
        if pending:
            words.append(pending)
        if words and len(words) <= max_words and (compounds or not has_cpd):
            out.append(" ".join(iast_to_deva(w) for w in words) + " ।")
    return out


def main(max_words: int = 12) -> None:
    src = ROOT / "vendor" / "dcs-src" / "dcs" / "data" / "conllu" / "files"
    dest = ROOT / "vendor" / "corpora" / "sa"
    dest.mkdir(parents=True, exist_ok=True)
    total = 0
    for text in TEXTS:
        seen, lines = set(), []
        for f in sorted((src / text).glob("*.conllu")):
            for s in sentences_of(f.read_text(encoding="utf-8"), max_words, compounds=False):
                if s not in seen and len(s.split()) >= 3:
                    seen.add(s); lines.append(s)
        (dest / f"{text}.txt").write_text("\n".join(lines) + "\n", encoding="utf-8")
        print(f"{text}: {len(lines)} sentences"); total += len(lines)
    print(f"sa corpus: {total} sentences (DCS, CC BY 4.0)")


if __name__ == "__main__":
    main(int(sys.argv[1]) if len(sys.argv) > 1 else 12)
