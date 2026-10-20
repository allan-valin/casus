#!/usr/bin/env python3
"""An .xlsx workbook's sheets as CSV files, standard library only (no openpyxl in the build). Usage:
xlsx_csv.py book.xlsx out_dir → out_dir/<sheet name>.csv"""
import csv
import re
import sys
import zipfile
import xml.etree.ElementTree as ET
from pathlib import Path

NS = {"m": "http://schemas.openxmlformats.org/spreadsheetml/2006/main",
      "r": "http://schemas.openxmlformats.org/officeDocument/2006/relationships"}


def col_index(ref: str) -> int:
    n = 0
    for ch in re.match(r"[A-Z]+", ref).group(0):
        n = n * 26 + ord(ch) - 64
    return n - 1


def sheets(path: Path) -> dict:
    z = zipfile.ZipFile(path)
    shared = []
    if "xl/sharedStrings.xml" in z.namelist():
        for si in ET.fromstring(z.read("xl/sharedStrings.xml")).findall("m:si", NS):
            shared.append("".join(t.text or "" for t in si.iter(f"{{{NS['m']}}}t")))
    book = ET.fromstring(z.read("xl/workbook.xml"))
    rels = {r.get("Id"): r.get("Target") for r in ET.fromstring(z.read("xl/_rels/workbook.xml.rels"))}
    out = {}
    for sh in book.find("m:sheets", NS):
        target = rels[sh.get(f"{{{NS['r']}}}id")].lstrip("/")
        target = target if target.startswith("xl/") else f"xl/{target}"
        rows = []
        for row in ET.fromstring(z.read(target)).iter(f"{{{NS['m']}}}row"):
            cells = {}
            for c in row.findall("m:c", NS):
                v = c.find("m:v", NS)
                text = c.find("m:is/m:t", NS)
                val = (shared[int(v.text)] if c.get("t") == "s" and v is not None else v.text if v is not None else text.text if text is not None else "")
                cells[col_index(c.get("r"))] = val
            rows.append([cells.get(i, "") for i in range(max(cells) + 1)] if cells else [])
        out[sh.get("name")] = rows
    return out


if __name__ == "__main__":
    dest = Path(sys.argv[2]); dest.mkdir(parents=True, exist_ok=True)
    for name, rows in sheets(Path(sys.argv[1])).items():
        with open(dest / f"{name}.csv", "w", newline="", encoding="utf-8") as f:
            csv.writer(f).writerows(rows)
        print(name, len(rows))
