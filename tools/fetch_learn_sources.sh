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
# one Tatoeba code per Learn language (tools/learn_curriculum.mjs TATOEBA), plus English and Portuguese for translations
for t3 in jpn mkd ara lat grc deu; do
  for f in "$t3/${t3}_sentences.tsv.bz2" "$t3/$t3-eng_links.tsv.bz2" "$t3/$t3-por_links.tsv.bz2"; do
    [ -f "$V/tatoeba/$(basename $f)" ] || curl -sfL -o "$V/tatoeba/$(basename $f)" "https://downloads.tatoeba.org/exports/per_language/$f" || true
  done
done
for f in eng/eng_sentences.tsv.bz2 por/por_sentences.tsv.bz2; do
  [ -f "$V/tatoeba/$(basename $f)" ] || curl -sfL -o "$V/tatoeba/$(basename $f)" "https://downloads.tatoeba.org/exports/per_language/$f"
done
# D'Ooge, Latin for Beginners (public domain): Project Gutenberg #18251
mkdir -p "$V/dooge"
[ -f "$V/dooge/dooge.html" ] || curl -sfL -o "$V/dooge/dooge.html" "https://www.gutenberg.org/files/18251/18251-h/18251-h.htm"
# Greek prose for exercises: Perseus canonical-greekLit (CC BY-SA 4.0), cut into sentences
mkdir -p "$V/corpora/grc"
for p in tlg0032/tlg006/tlg0032.tlg006.perseus-grc2.xml tlg0032/tlg002/tlg0032.tlg002.perseus-grc2.xml tlg0540/tlg001/tlg0540.tlg001.perseus-grc2.xml; do
  [ -f "$V/corpora/grc/$(basename $p)" ] || curl -sfL -o "$V/corpora/grc/$(basename $p)" "https://raw.githubusercontent.com/PerseusDL/canonical-greekLit/master/data/$p"
done
python3 "$ROOT/tools/build_corpus.py" grc
# Grimm Grammar (COERLL, CC BY 4.0): the grammar index, every page it links, and the answer key
mkdir -p "$V/grimm"
[ -f "$V/grimm/index.html" ] || curl -sfL -o "$V/grimm/index.html" "https://coerll.utexas.edu/gg/gr/index.html"
for p in $(grep -o 'href="[a-z_0-9]*\.html"' "$V/grimm/index.html" | sed 's/href="//;s/"//' | sort -u | grep -v -e about -e characters -e credits -e help -e '^index'); do
  [ -f "$V/grimm/$p" ] || { curl -sfL -o "$V/grimm/$p" "https://coerll.utexas.edu/gg/gr/$p"; sleep 0.5; }
done
echo "Learn sources in $V"
