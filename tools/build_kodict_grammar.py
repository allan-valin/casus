#!/usr/bin/env python3
"""The grammar entries of the NIKL Basic Korean Dictionary (한국어기초사전, CC BY-SA 2.0 KR; vendor/kodict/kodict.zip):
endings (어미), particles (조사), affixes and set expressions, with the Korean definition, the English equivalent and
definition, and the dictionary's example sentences. Writes vendor/kodict/grammar.json, keyed by written form."""
import json
import zipfile
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]


def feats(node):
    f = node.get("feat", []) if isinstance(node, dict) else []
    f = f if isinstance(f, list) else [f]
    return {x.get("att"): x.get("val") for x in f}


def main():
    out = {}
    z = zipfile.ZipFile(ROOT / "vendor" / "kodict" / "kodict.zip")
    for name in z.namelist():
        data = json.loads(z.read(name))
        entries = data["LexicalResource"]["Lexicon"]["LexicalEntry"]
        for e in entries:
            top = feats(e)
            lemma = feats(e.get("Lemma", {})).get("writtenForm")
            pos = top.get("partOfSpeech")
            unit = top.get("lexicalUnit")
            if not lemma or not (pos in ("어미", "조사") or unit in ("구", "관용구") and lemma.startswith("-")):
                continue
            senses = e.get("Sense", [])
            senses = senses if isinstance(senses, list) else [senses]
            items = []
            for s in senses[:3]:
                sf = feats(s)
                eq = s.get("Equivalent", [])
                eq = eq if isinstance(eq, list) else [eq]
                en = next((feats(q) for q in eq if feats(q).get("language") == "영어"), {})
                ex = s.get("SenseExample", [])
                ex = ex if isinstance(ex, list) else [ex]
                examples = [feats(x).get("example") for x in ex if feats(x).get("type") in ("문장", "대화", None)][:4]
                items.append({"ko": sf.get("definition"), "en": en.get("lemma"), "en_def": en.get("definition"), "examples": [x for x in examples if x]})
            out.setdefault(lemma, []).append({"pos": pos or unit, "senses": items})
        print(name, len(out))
    (ROOT / "vendor" / "kodict" / "grammar.json").write_text(json.dumps(out, ensure_ascii=False), encoding="utf-8")


if __name__ == "__main__":
    main()
