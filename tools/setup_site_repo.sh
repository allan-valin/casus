#!/usr/bin/env bash
# Creates the repo for one of the extra sites and turns on its Pages: tools/setup_site_repo.sh <asia|world>
# The repo holds only deploy/site-pages.yml (filled in) and a README; the code stays in allan-valin/casus.
set -euo pipefail
SITE_ID="$1"
case "$SITE_ID" in asia) REPO=casus-asia; TITLE="Casus Asia"; LANGS="Japanese, Korean, Chinese";;
  world) REPO=casus-world; TITLE="Casus World"; LANGS="Portuguese, Macedonian, English, Spanish";; *) echo "asia or world"; exit 1;; esac
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
TMP="$(mktemp -d)"; trap 'rm -rf "$TMP"' EXIT
gh repo view "allan-valin/$REPO" >/dev/null 2>&1 || gh repo create "allan-valin/$REPO" --public --description "$TITLE: read $LANGS sentence by sentence, drills, proofreading — built from allan-valin/casus"
git clone -q "https://github.com/allan-valin/$REPO.git" "$TMP/r" 2>/dev/null || mkdir -p "$TMP/r"
cd "$TMP/r"; git init -q -b main 2>/dev/null || true
mkdir -p .github/workflows
sed -e "s/SITE_ID/$SITE_ID/g" -e "s/REPO_NAME/$REPO/g" -e "s/SITE_TITLE/$TITLE/g" "$ROOT/deploy/site-pages.yml" > .github/workflows/pages.yml
printf '# %s\n\n%s, sentence by sentence: the reader, drills and proofreading of [Casus](https://github.com/allan-valin/casus).\nLive at https://allan-valin.github.io/%s/.\n\nThis repo only publishes the site: the code and the dictionaries are in allan-valin/casus\n(one codebase, three sites). Licences and sources: see Casus'"'"'s NOTICE.md.\n' "$TITLE" "$LANGS" "$REPO" > README.md
git add -A
git -c user.name="$(git -C "$ROOT" config user.name)" -c user.email="$(git -C "$ROOT" config user.email)" commit -q -m "Publish $TITLE from allan-valin/casus" || true
git remote get-url origin >/dev/null 2>&1 || git remote add origin "https://github.com/allan-valin/$REPO.git"
git push -q -u origin main
gh api -X POST "repos/allan-valin/$REPO/pages" -f build_type=workflow >/dev/null 2>&1 || gh api -X PUT "repos/allan-valin/$REPO/pages" -f build_type=workflow >/dev/null
echo "allan-valin/$REPO ready"
