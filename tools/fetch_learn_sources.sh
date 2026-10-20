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
for t3 in jpn mkd ara lat grc deu rus kor cmn fin ell san ces pol tur hun isl por; do
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
# NIKL Basic Korean Dictionary (CC BY-SA 2.0 KR): words by level and example sentences
mkdir -p "$V/kodict"
[ -f "$V/kodict/kodict.zip" ] || curl -sfL -o "$V/kodict/kodict.zip" "https://raw.githubusercontent.com/71/study-korean/master/data/kodict.zip"
python3 "$ROOT/tools/build_kodict.py"
# HSK 3.0 syllabus and words (ivankra/hsk30, MIT)
mkdir -p "$V/hsk30"
for f in hsk30.csv hsk30-grammar.csv hsk30-chars.csv LICENSE README.md; do
  [ -f "$V/hsk30/$f" ] || curl -sfL -o "$V/hsk30/$f" "https://raw.githubusercontent.com/ivankra/hsk30/master/$f"
done
# Digital Corpus of Sanskrit (CC BY 4.0): a sparse clone of the texts tools/build_dcs.py reads
if [ ! -d "$V/dcs-src" ]; then
  git clone -q --depth 1 --filter=blob:none --sparse https://github.com/OliverHellwig/sanskrit.git "$V/dcs-src"
  (cd "$V/dcs-src" && git sparse-checkout set "dcs/data/conllu/files/Hitopadeśa" "dcs/data/conllu/files/Śukasaptati" \
    "dcs/data/conllu/files/Vetālapañcaviṃśatikā" "dcs/data/conllu/files/Kathāsaritsāgara" "dcs/data/conllu/files/Rāmāyaṇa")
fi
# Czech: Nigrin, Bohemian Grammar (1918, PD, Gutenberg #50595)
mkdir -p "$V/nigrin"; [ -s "$V/nigrin/nigrin.txt" ] || curl -sfL https://www.gutenberg.org/cache/epub/50595/pg50595.txt -o "$V/nigrin/nigrin.txt"
# Korean: NIKL International Standard Curriculum grammar/vocabulary list (KOGL type 1), as CSV
mkdir -p "$V/nikl"; [ -s "$V/nikl/grammar-vocab-list.xlsx" ] || curl -sfL "https://www.korean.go.kr/common/download.do?file_path=reportData&c_file_name=157339df-1904-443a-b1a9-d6d34578ba93.xlsx&o_file_name=list.xlsx" -o "$V/nikl/grammar-vocab-list.xlsx"
python3 "$(dirname "$0")/xlsx_csv.py" "$V/nikl/grammar-vocab-list.xlsx" "$V/nikl/csv"
python3 "$(dirname "$0")/build_kodict_grammar.py"
# Sanskrit: the learnsanskrit.org guide (CC BY 4.0 per page): the repository for its index, the rendered pages, politely
[ -d "$V/learnsanskrit" ] || git clone -q --depth 1 https://github.com/sanskrit/learnsanskrit.org.git "$V/learnsanskrit"
mkdir -p "$V/learnsanskrit/html"
python3 - "$V/learnsanskrit" <<'PY' > "$V/learnsanskrit/pages.txt"
import json, sys
root = sys.argv[1] + "/content/guide"
for t in json.load(open(root + "/index.json"))["topics"]:
    try:
        for l in json.load(open(f"{root}/{t}/index.json")).get("lessons", []):
            print(f"/guide/{t}/{l}/")
    except FileNotFoundError:
        pass
PY
while read p; do f="$V/learnsanskrit/html/$(echo "$p" | sed 's#^/guide/##;s#/$##;s#/#__#g').html"
  [ -s "$f" ] || { curl -sfL "https://www.learnsanskrit.org$p" -o "$f"; sleep 1.5; }; done < "$V/learnsanskrit/pages.txt"
# Latin: Allen and Greenough, DCC edition (CC BY-SA): the pages its menu lists, politely
mkdir -p "$V/ag"; [ -s "$V/ag/alphabet.html" ] || curl -sfL https://dcc.dickinson.edu/grammar/latin/alphabet -o "$V/ag/alphabet.html"
grep -o 'href="[^"]*/grammar/latin/[^"#?]*"' "$V/ag/alphabet.html" | sed 's/href="//;s/"$//;s#^https\?://dcc.dickinson.edu##' | awk '!seen[$0]++' | while read p; do
  f="$V/ag/$(basename "$p").html"; [ -s "$f" ] || { curl -sfL "https://dcc.dickinson.edu$p" -o "$f"; sleep 1.5; }; done
# Hungarian: Ginever, Hungarian Grammar (1909, PD, Gutenberg #76725)
mkdir -p "$V/ginever"; [ -s "$V/ginever/ginever.txt" ] || curl -sfL https://www.gutenberg.org/cache/epub/76725/pg76725.txt -o "$V/ginever/ginever.txt"
# Finnish: Eliot, A Finnish Grammar (1890, PD, Gutenberg #59795)
mkdir -p "$V/eliot"; [ -s "$V/eliot/eliot.txt" ] || curl -sfL https://www.gutenberg.org/cache/epub/59795/pg59795.txt -o "$V/eliot/eliot.txt"
echo "Learn sources in $V"
