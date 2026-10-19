"""Korean material from the NIKL Basic Korean Dictionary (한국어기초사전, 국립국어원, CC BY-SA 2.0 KR; the export
mirrored in github.com/71/study-korean, vendor/kodict/kodict.zip): its example sentences (type 문장) become an
exercise corpus (vendor/corpora/ko/kodict.txt, one per line), and its words with their learner level (초급, 중급, 고급),
part of speech and English equivalent a vocabulary list (vendor/kodict/vocab.tsv). Read one file of the zip at a time.
Usage: python3 tools/build_kodict.py"""
from __future__ import annotations

import json
import zipfile
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]


def feats(f) -> dict:
    if isinstance(f, dict):
        f = [f]
    out = {}
    for x in f or []:
        out.setdefault(x["att"], x["val"])
    return out


def as_list(x):
    return x if isinstance(x, list) else ([x] if x else [])


def entries_of(data: dict):
    for e in as_list(data["LexicalResource"]["Lexicon"]["LexicalEntry"]):
        f = feats(e.get("feat"))
        lemma = e.get("Lemma")
        lemma = lemma[0] if isinstance(lemma, list) else (lemma or {})
        word = feats(lemma.get("feat")).get("writtenForm", "")
        senses = as_list(e.get("Sense"))
        english, examples = "", []
        for s in senses:
            for eq in as_list(s.get("Equivalent")):
                g = feats(eq.get("feat"))
                if not english and g.get("language") == "영어":
                    english = g.get("lemma", "")
            for ex in as_list(s.get("SenseExample")):
                g = feats(ex.get("feat"))
                if g.get("type") == "문장" and g.get("example"):
                    examples.append(g["example"])
        yield {"word": word, "pos": f.get("partOfSpeech", ""), "level": f.get("vocabularyLevel", ""), "en": english, "examples": examples}


def main() -> None:
    sentences, vocab = {}, []
    with zipfile.ZipFile(ROOT / "vendor" / "kodict" / "kodict.zip") as z:
        for name in sorted(z.namelist()):
            data = json.loads(z.read(name))
            for e in entries_of(data):
                if e["level"] in ("초급", "중급", "고급") and e["word"]:
                    vocab.append((e["word"], e["pos"], e["level"], e["en"]))
                for s in e["examples"]:
                    s = " ".join(s.split())
                    if 3 <= len(s.split()) <= 20:
                        sentences.setdefault(s, None)
            del data
            print(name, len(vocab), len(sentences))
    (ROOT / "vendor" / "corpora" / "ko").mkdir(parents=True, exist_ok=True)
    (ROOT / "vendor" / "corpora" / "ko" / "kodict.txt").write_text("\n".join(sentences) + "\n", encoding="utf-8")
    (ROOT / "vendor" / "kodict" / "vocab.tsv").write_text("\n".join("\t".join(v) for v in vocab) + "\n", encoding="utf-8")


if __name__ == "__main__":
    main()
