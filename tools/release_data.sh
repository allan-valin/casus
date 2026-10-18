#!/usr/bin/env bash
# Packs data/<code>/ and uploads it to the `data` release as data-<code>-<date>.tar.gz,
# replacing that language's older assets. Data lives in releases, not in git history
# (docs/superpowers/specs/2026-10-18-casus-languages-design.md §11.6).
set -euo pipefail
CODE="${1:?usage: release_data.sh <code>}"
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
SRC="$ROOT/data/$CODE"
test -f "$SRC/manifest.json" || { echo "no $SRC/manifest.json; build it first" >&2; exit 1; }
gh release view data >/dev/null 2>&1 || gh release create data --title "Data assets" \
  --notes "Built dictionary indexes, one archive per language. Downloaded by tools/fetch_data_assets.sh and the Pages workflow. Licences: see NOTICE.md."
ASSET="data-$CODE-$(date -u +%F).tar.gz"
tar -czf "/tmp/$ASSET" -C "$ROOT/data" "$CODE"
# upload first, then remove older archives: a failed upload or a deploy in between must still find data
gh release upload data "/tmp/$ASSET" --clobber
for old in $(gh release view data --json assets -q ".assets[].name" | grep "^data-$CODE-" | grep -v "^$ASSET$" || true); do
  gh release delete-asset data "$old" -y
done
rm -f "/tmp/$ASSET"
echo "uploaded $ASSET ($(du -sh "$SRC" | cut -f1) unpacked)"
