#!/usr/bin/env bash
# Downloads the built dictionary indexes from the `data` release into data/<code>/.
# Usage: fetch_data_assets.sh [code …]   (no codes: every language in the release)
# DATA_DIR overrides the destination (default: <repo>/data).
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
DEST="${DATA_DIR:-$ROOT/data}"
REPO="${GH_REPO:-allan-valin/casus}"
mkdir -p "$DEST"
names=$(gh release view data --repo "$REPO" --json assets -q '.assets[].name' | grep '^data-.*\.tar\.gz$' | sort)
if [ $# -gt 0 ]; then
  names=$(for c in "$@"; do echo "$names" | grep "^data-$c-" | tail -1 || true; done)   # a language with no data yet is skipped
else
  names=$(echo "$names" | sed -E 's/^data-([^-]+)-.*/\1 &/' | sort -k1,1 -k2,2 | awk '{last[$1]=$2} END {for (k in last) print last[k]}')
fi
TMP="$(mktemp -d)"; trap 'rm -rf "$TMP"' EXIT
for n in $names; do
  gh release download data --repo "$REPO" --pattern "$n" --dir "$TMP" --clobber
  code=$(echo "$n" | sed -E 's/^data-([^-]+)-.*/\1/')
  rm -rf "$DEST/$code"
  tar -xzf "$TMP/$n" -C "$DEST"
  echo "data/$code <- $n"
done
