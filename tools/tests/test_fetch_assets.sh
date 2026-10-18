#!/usr/bin/env bash
# Checks that tools/fetch_data_assets.sh restores a language's data from the `data` release.
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
TMP="$(mktemp -d)"; trap 'rm -rf "$TMP"' EXIT
DATA_DIR="$TMP/data" bash "$ROOT/tools/fetch_data_assets.sh" la
test -f "$TMP/data/la/manifest.json" || { echo "FAIL: data/la/manifest.json missing"; exit 1; }
test -d "$TMP/data/la/forms" || { echo "FAIL: data/la/forms missing"; exit 1; }
echo "PASS: $(ls "$TMP/data/la/forms" | wc -l) shards restored"
