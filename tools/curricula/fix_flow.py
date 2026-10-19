"""Quote the items of `- [a, b, c]` lines that YAML cannot read as they are (a '?' or ':' inside a sentence).
Usage: python3 tools/curricula/fix_flow.py <file.yml>; prints lines whose item count looks wrong."""
import json
import re
import sys

import yaml

path = sys.argv[1]
out = []
for n, line in enumerate(open(path, encoding="utf-8").read().split("\n"), 1):
    m = re.match(r"^(\s*- )\[(.*)\]\s*$", line)
    if m:
        try:
            yaml.safe_load(f"[{m.group(2)}]")
        except yaml.YAMLError:
            items, cur, q = [], "", None
            for ch in m.group(2):
                if q:
                    cur += ch
                    if ch == q:
                        q = None
                elif ch in "\"'" and not cur.strip():
                    q = ch
                    cur += ch
                elif ch == ",":
                    items.append(cur.strip())
                    cur = ""
                else:
                    cur += ch
            items.append(cur.strip())
            items = [i[1:-1] if len(i) > 1 and i[0] == i[-1] and i[0] in "\"'" else i for i in items]
            line = m.group(1) + "[" + ", ".join(json.dumps(i, ensure_ascii=False) for i in items) + "]"
            print(f"{n}: {len(items)} items: {items}")
    out.append(line)
open(path, "w", encoding="utf-8").write("\n".join(out))
