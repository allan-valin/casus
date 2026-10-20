#!/usr/bin/env python3
"""Quote every one-line `meaning:` and topic value in translation overlays (a colon inside would break the YAML)."""
import re
import sys

for p in sys.argv[1:]:
    lines = open(p, encoding="utf-8").read().split("\n")
    out = []
    for line in lines:
        m = re.match(r'^(\s+)(meaning|[^\s#][^:]*?): (?![|>\["\']).*\S$', line)
        if m and (m.group(2) == "meaning" or len(m.group(1)) == 2) and not line.strip().startswith(("- ", '"', "'")):
            key, val = line.split(": ", 1) if m.group(2) != "meaning" else (line[: line.index("meaning:") + 7], line[line.index("meaning:") + 9:])
            val = val.replace("\\", "\\\\").replace('"', '\\"')
            line = f'{key}: "{val}"'
        out.append(line)
    open(p, "w", encoding="utf-8").write("\n".join(out))
