#!/usr/bin/env bash
# Downloads one language's Wiktextract extract of the English Wiktionary from kaikki.org
# (CC BY-SA / GFDL, like Wiktionary) into vendor/wiktextract/. Usage: fetch_wiktextract.sh "Ancient Greek"
set -euo pipefail
LANG_NAME="${1:?usage: fetch_wiktextract.sh <Language as kaikki names it>}"
FILE_NAME="kaikki.org-dictionary-${LANG_NAME// /}.jsonl"
DEST="$(dirname "$0")/../vendor/wiktextract"
URL="https://kaikki.org/dictionary/${LANG_NAME// /%20}/${FILE_NAME}"
mkdir -p "$DEST"
echo "fetching $URL"
curl -fL --retry 3 -C - "$URL" -o "$DEST/$FILE_NAME"
date -u +%Y-%m-%d > "$DEST/${FILE_NAME}.FETCHED"
# kept compressed (the disk filled up on 2026-10-19); the build tools read .jsonl.gz (tools/casus_build/dump.py)
gzip -f "$DEST/$FILE_NAME"
ls -l "$DEST/$FILE_NAME.gz"
