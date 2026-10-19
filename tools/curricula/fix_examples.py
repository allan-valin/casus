"""Rejoin example lines that YAML split at commas: every sentence of an example ends in . ? ! (the gap target, last,
does not), so pieces are joined until one ends a sentence. Usage: python3 tools/curricula/fix_examples.py <file.yml>"""
import json
import re
import sys

import yaml

path = sys.argv[1]
lines = open(path, encoding="utf-8").read().split("\n")
inside = False
for n, line in enumerate(lines):
    if re.match(r"^\s*examples:\s*$", line):
        inside = True
        continue
    if inside and not re.match(r"^\s*- \[", line):
        inside = False
    if not inside:
        continue
    m = re.match(r"^(\s*- )\[(.*)\]\s*$", line)
    items = yaml.safe_load(f"[{m.group(2)}]")
    if len(items) <= 4 and all(str(i).rstrip().endswith((".", "?", "!", "…", '"', "»")) for i in items[:3]):
        continue
    out, buf = [], []
    for i in map(str, items):
        buf.append(i)
        if i.rstrip().endswith((".", "?", "!", "…")):
            out.append(", ".join(buf))
            buf = []
    if buf:
        out.append(", ".join(buf))
    if out != items:
        lines[n] = m.group(1) + "[" + ", ".join(json.dumps(i, ensure_ascii=False) for i in out) + "]"
        print(f"{n + 1}: {out}")
open(path, "w", encoding="utf-8").write("\n".join(lines))
