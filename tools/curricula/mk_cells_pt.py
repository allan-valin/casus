"""One-off (2026-10-19): give the English-only table cells of the Macedonian curriculum their Portuguese."""
import json
import re
import sys
from pathlib import Path

import yaml

PT = {
    "soft g": "g suave", "soft k": "k suave", "dz": "dz", "y in yes": "i de iate", "lh / lli": "lh", "nh / ny": "nh",
    "j in jam": "dj", "ts": "ts", "ch": "tch", "sh": "ch / x", "s in pleasure": "j de já", "h / ch in Bach": "rr aspirado",
    "ѓакон (pupil)": "ѓакон (aluno)", "ќерка (daughter)": "ќерка (filha)", "ѕвезда (star)": "ѕвезда (estrela)",
    "јас (I)": "јас (eu)", "љубов (love)": "љубов (amor)", "коњ (horse)": "коњ (cavalo)", "џеб (pocket)": "џеб (bolso)",
    "цвет (flower)": "цвет (flor)", "чај (tea)": "чај (chá)", "шума (forest)": "шума (floresta)", "жена (woman)": "жена (mulher)",
    "хотел (hotel)": "хотел (hotel)", "gj": "gj", "kj": "kj", "j": "j", "lj": "lj", "nj": "nj", "dž": "dž", "c": "c", "č": "č", "š": "š", "ž": "ž", "h": "h",
    "јас (I)": "јас (eu)", "ти (you)": "ти (você)", "тој / таа / тоа (he / she / it)": "тој / таа / тоа (ele / ela)",
    "ние (we)": "ние (nós)", "вие (you, plural or polite)": "вие (vocês, ou o senhor / a senhora)", "тие (they)": "тие (eles, elas)",
    "what": "o quê", "who, which": "quem, qual", "whose": "de quem", "where": "onde", "when": "quando", "why": "por quê",
    "how": "como", "how much, how many": "quanto, quantos",
    "consonant": "consoante",
    "m., 1 syllable: -ови": "m., 1 sílaba: -ови", "m., 2+ syllables: -и": "m., 2+ sílabas: -и", "к → ц before -и": "к → ц antes de -и",
    "f.: -а → -и": "f.: -а → -и", "n.: -о → -а": "n.: -о → -а", "n.: -е → -иња": "n.: -е → -иња", "irregular": "irregular",
    "new": "novo", "small": "pequeno", "good": "bom", "big": "grande", "beautiful": "bonito", "Macedonian": "macedônio",
    "(possessive first: the article on it)": "(possessivo primeiro: o artigo vai nele)",
    "даде (irregular)": "даде (irregular)",
    "Марко (name)": "Марко (nome)", "I saw Marko": "vi o Marko", "книгата (the book)": "книгата (o livro)",
    "I'm reading the book": "estou lendo o livro", "книга (a book)": "книга (um livro)", "Читам книга. (no doubling)": "Читам книга. (sem duplicação)",
    "I'm reading a book": "estou lendo um livro", "I told Ana": "eu disse à Ana", "I bought (it) for the children": "comprei para as crianças",
    "две книги (f.: normal)": "две книги (f.: normal)", "at 8": "às 8",
    "he/she'd like": "ele/ela gostaria",
    "If I had money, I'd buy a car": "se eu tivesse dinheiro, compraria um carro", "If I'd known, I'd have told you": "se eu soubesse, teria te dito",
    "If I'd been here, I'd have helped you": "se eu estivesse aqui, teria te ajudado",
    "луѓето (pl.)": "луѓето (pl.)", "person after prep.": "pessoa depois de prep.",
    "prefix / prefixo": "prefix / prefixo",
}
for path in sorted(Path(sys.argv[1]).glob("*.yml")):
    lines = path.read_text(encoding="utf-8").split("\n")
    changed = 0
    for n, line in enumerate(lines):
        m = re.match(r"^(\s*- )\[(.*)\]\s*$", line)
        if not m:
            continue
        items = yaml.safe_load(f"[{m.group(2)}]")
        if not all(isinstance(i, (str, int)) for i in items):
            continue
        new = [{"en": i, "pt": PT[i]} if isinstance(i, str) and i in PT and PT[i] != i else i for i in items]
        if new != items:
            lines[n] = m.group(1) + "[" + ", ".join(json.dumps(i, ensure_ascii=False) for i in new) + "]"
            changed += 1
    path.write_text("\n".join(lines), encoding="utf-8")
    print(path.name, changed)
