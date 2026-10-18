#!/usr/bin/env bash
# Downloads the Latin entries of the Portuguese Wiktionary, as extracted by Wiktextract
# (kaikki.org, CC BY-SA / GFDL like Wiktionary itself), into vendor/ptwiktionary/.
# The file is small (3,672 Latin words, ~2.5 MB): a partial, common-vocabulary layer.
set -euo pipefail
DEST="$(dirname "$0")/../vendor/ptwiktionary"
URL="https://kaikki.org/ptwiktionary/Latim/kaikki.org-dictionary-Latim.jsonl"
mkdir -p "$DEST"
echo "fetching $URL"
curl -fsSL "$URL" -o "$DEST/kaikki.org-dictionary-Latim.jsonl"
date -u +%Y-%m-%d > "$DEST/FETCHED"
wc -lc "$DEST/kaikki.org-dictionary-Latim.jsonl"
