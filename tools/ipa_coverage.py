#!/usr/bin/env python3
"""Does every word of every Conversation step have an expected IPA for the pronunciation compare? (Allan, 2026-10-27:
mk C2-05 "Не те разбрав добро" showed an empty expected row for разбрав.)

A word counts when it is a headword with Wiktionary IPA (exact) or has a generated form IPA (data/<code>/ipa-forms,
tools/form_ipa.py). The lemma's IPA is not counted: the compare does not score it, it is a different word.

  python3 tools/ipa_coverage.py mk de ja ko     # one line per language, then the words without IPA
"""
import json, re, sys
from collections import Counter
from pathlib import Path
import yaml

WORD = re.compile(r"[^\W\d_]+(?:['’\-][^\W\d_]+)*")
RUBY = re.compile(r'\[[^\]]*\]')          # Japanese furigana markup 漢字[かな]: the reading goes, the kanji stay
NO_SPACES = {'ja', 'zh'}


def greedy(run, headwords, max_len=8):
    """a text without spaces cut into the longest headwords known, as the browser does (pronounce.js greedyWords)"""
    out, unknown, i = [], '', 0
    while i < len(run):
        n = min(max_len, len(run) - i)
        while n and run[i:i + n].lower() not in headwords: n -= 1
        if not n:
            unknown += run[i]; i += 1; continue
        if unknown: out.append(unknown); unknown = ''
        out.append(run[i:i + n]); i += n
    return out + ([unknown] if unknown else [])


def unit_words(unit):
    """the target-language words of a unit: string `text` values (dicts are the learner's language) and buildup parts"""
    out = set()
    def walk(x):
        if isinstance(x, dict):
            for k, v in x.items():
                if k == 'text' and isinstance(v, str):
                    out.update(w.lower() for w in WORD.findall(RUBY.sub('', v)))
                elif k == 'parts' and isinstance(v, list):
                    out.update(w.lower() for p in v if isinstance(p, str) for w in WORD.findall(p))
                elif k not in ('meaning', 'ask', 'situation', 'title'):
                    walk(v)
        elif isinstance(x, list):
            for v in x: walk(v)
    walk(unit)
    return out


def covered(word, headwords, forms):
    w = word.lower()
    if w in headwords: return 'exact'
    if w in forms: return 'form'
    return None


def main(code):
    root = Path('data') / code
    ipa = json.loads((root / 'ipa.json').read_text()) if (root / 'ipa.json').exists() else {}
    lemmas = json.loads((root / 'lemmas.json').read_text()) if (root / 'lemmas.json').exists() else {}
    headwords = {lemmas[k]['headword'].lower() for k, v in ipa.items() if k in lemmas and v}
    forms = {}
    for f in (root / 'ipa-forms').glob('*.json') if (root / 'ipa-forms').exists() else []:
        forms.update(json.loads(f.read_text()))
    words, missing = Counter(), Counter()
    for f in sorted(Path('tools/conversation', code).glob('*.yml')):
        found = unit_words(yaml.safe_load(f.read_text()) or {})
        if code in NO_SPACES: found = {w for run in found for w in greedy(run, headwords)}
        for w in found:
            words[w] += 1
            if not covered(w, headwords, forms): missing[w] += 1
    kinds = Counter(covered(w, headwords, forms) for w in words)
    print(f'{code}: {len(words)} distinct words — exact {kinds["exact"]}, form {kinds["form"]}, none {kinds[None]}')
    print('  without IPA (units):', ' '.join(f'{w}({n})' for w, n in missing.most_common(60)))


if __name__ == '__main__':
    for c in sys.argv[1:]:
        main(c)
