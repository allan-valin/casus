"""Rejoin `- [a, b]` items that YAML split inside parentheses ("вие (you, plural)") and requote them.
Usage: python3 tools/curricula/fix_parens.py <file.yml>"""
import json
import re
import sys

import yaml

path = sys.argv[1]
lines = open(path, encoding="utf-8").read().split("\n")
for n, line in enumerate(lines):
    m = re.match(r"^(\s*- )\[(.*)\]\s*$", line)
    if not m:
        continue
    try:
        items = yaml.safe_load(f"[{m.group(2)}]")
    except yaml.YAMLError:
        continue
    if not all(isinstance(i, str) for i in items):
        continue
    out = []
    for i in items:
        if out and out[-1].count("(") > out[-1].count(")"):
            out[-1] = f"{out[-1]}, {i}"
        else:
            out.append(i)
    if out != items:
        lines[n] = m.group(1) + "[" + ", ".join(json.dumps(i, ensure_ascii=False) for i in out) + "]"
        print(f"{n + 1}: {out}")
open(path, "w", encoding="utf-8").write("\n".join(lines))
