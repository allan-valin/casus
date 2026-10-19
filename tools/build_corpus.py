"""Sentences from open texts for Learn exercises where Tatoeba has few (Ancient Greek: 1,776 sentences): a TEI text
(Perseus, CC BY-SA 4.0) cut into sentences of 4–25 words, one per line, into vendor/corpora/<code>/<name>.txt.
Usage: python3 tools/build_corpus.py grc"""
from __future__ import annotations

import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]


def sentences_of_tei(xml: str) -> list[str]:
    body = re.search(r"<body>(.*)</body>", xml, flags=re.S)
    t = body.group(1) if body else xml
    t = re.sub(r"<note.*?</note>", "", t, flags=re.S)
    t = re.sub(r"<[^>]+>", " ", t)
    t = re.sub(r"\s+", " ", t).strip()
    out = []
    for s in re.findall(r"[^.;·;]+[.;·;]", t):
        s = s.strip()
        if 4 <= len(s.split()) <= 25:
            out.append(s)
    return out


def main(code: str) -> None:
    folder = ROOT / "vendor" / "corpora" / code
    for xml in sorted(folder.glob("*.xml")):
        sents = sentences_of_tei(xml.read_text(encoding="utf-8"))
        xml.with_suffix(".txt").write_text("\n".join(sents) + "\n", encoding="utf-8")
        print(f"{xml.stem}: {len(sents)} sentences")


if __name__ == "__main__":
    main(sys.argv[1])
