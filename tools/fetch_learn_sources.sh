#!/usr/bin/env bash
# Sources for the Learn tab, into vendor/ (git-ignored): then `python3 tools/build_learn.py ja` and
# `node tools/learn_examples.mjs ja`. Licences in NOTICE.md (Learn tab).
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
V="$ROOT/vendor"
mkdir -p "$V/tatoeba"
# JLPT Grammar Enhanced, CC BY-SA 4.0 (pinned to the commit the lessons were built from)
if [ ! -d "$V/jlpt-grammar-enhanced" ]; then
  T=$(mktemp -d)
  git clone -q https://github.com/maitodesu/jlpt-grammar-enhanced "$T/jge"
  git -C "$T/jge" checkout -q a4254e0addbc5d7820f06d63d3ea2561f538f72b
  mkdir -p "$V/jlpt-grammar-enhanced"
  cp -r "$T"/jge/src/n[1-5] "$T/jge/src/SUMMARY.md" "$T/jge/LICENSE" "$V/jlpt-grammar-enhanced/"
  rm -rf "$T"
fi
# Tatoeba, CC BY 2.0 FR: sentences and translation links per language
for f in jpn/jpn_sentences.tsv.bz2 eng/eng_sentences.tsv.bz2 por/por_sentences.tsv.bz2 jpn/jpn-eng_links.tsv.bz2 jpn/jpn-por_links.tsv.bz2; do
  [ -f "$V/tatoeba/$(basename $f)" ] || curl -sfL -o "$V/tatoeba/$(basename $f)" "https://downloads.tatoeba.org/exports/per_language/$f"
done
echo "Learn sources in $V"
