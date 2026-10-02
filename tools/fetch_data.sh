#!/usr/bin/env bash
# Downloads Whitaker's WORDS data (public domain) into vendor/.
set -euo pipefail
DEST="$(dirname "$0")/../vendor/whitakers-words"
BASE="https://raw.githubusercontent.com/mk270/whitakers-words/master"
mkdir -p "$DEST"
for f in DICTLINE.GEN INFLECTS.LAT UNIQUES.LAT; do
  echo "fetching $f"
  curl -fsSL "$BASE/$f" -o "$DEST/$f"
done
wc -l "$DEST"/*
