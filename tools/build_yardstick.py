#!/usr/bin/env python3
"""T5 vocabulary yardstick (Allan, 2026-10-27): the words a learner can be expected to know at each CEFR level, so a
Conversation unit's new items are judged against their own level — not a fixed top-1,000 or top-5,000.

A word's level is the lowest any source gives it:
  - Learn's vocabulary lessons of that level (data/<code>/learn/*.json, kind vocab);
  - a graded list where one exists: Japanese JLPT (OpenJLPT, N5 → A1 … N1 → C1), Korean NIKL learner vocabulary
    (국립국어원 한국어 학습용 어휘, 1급 → A1 … 6급 → C2);
  - lemma frequency in the language's Tatoeba sentences (forms → lemmas with Casus's own form index), in bands that
    grow with the level: top 1,000 = A1, 2,000 = A2, 3,500 = B1, 5,500 = B2, 8,000 = C1, 12,000 = C2.

  python3 tools/build_yardstick.py de mk ja ko      # writes data/<code>/yardstick.json {word: level}
"""
import bz2, csv, json, re, sys
from collections import Counter
from pathlib import Path

LEVELS = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2']
BANDS = [(1000, 'A1'), (2000, 'A2'), (3500, 'B1'), (5500, 'B2'), (8000, 'C1'), (12000, 'C2')]
TATOEBA = {'de': 'deu', 'mk': 'mkd', 'ru': 'rus', 'pl': 'pol', 'pt': 'por', 'es': 'spa', 'fr': 'fra', 'it': 'ita'}
JLPT = {'N5': 'A1', 'N4': 'A2', 'N3': 'B1', 'N2': 'B2', 'N1': 'C1'}
WORD = re.compile(r"[^\W\d_]+(?:['’\-][^\W\d_]+)*")


def level_of_rank(rank):
    return next((lv for top, lv in BANDS if rank <= top), None)


def merge(m, word, level):
    w = word.strip().lower()
    if w and level in LEVELS and (w not in m or LEVELS.index(level) < LEVELS.index(m[w])):
        m[w] = level


def nikl_word(w):
    return re.sub(r'\d+$', '', w.strip())


def tatoeba_lemmas(code, root):
    """lemma headwords by frequency in Tatoeba (each token counted for its first lemma)"""
    lemmas = json.loads((root / 'lemmas.json').read_text())
    forms = {}
    for f in (root / 'forms').glob('*.json'):
        forms.update(json.loads(f.read_text()))
    count = Counter()
    with bz2.open(Path('vendor/tatoeba') / f'{TATOEBA[code]}_sentences.tsv.bz2', 'rt', encoding='utf-8') as fh:
        for line in fh:
            parts = line.rstrip('\n').split('\t')
            for tok in WORD.findall(parts[-1]):
                hit = forms.get(tok) or forms.get(tok.lower()) or forms.get(tok[:1].upper() + tok[1:])
                if hit:
                    head = lemmas.get(str(hit[0][0]), {}).get('headword')
                    if head: count[head] += 1
    return [w for w, _ in count.most_common()]


def build(code):
    root = Path('data') / code
    m = {}
    for f in (root / 'learn').glob('*.json'):
        d = json.loads(f.read_text())
        if d.get('kind') == 'vocab':
            lv = d.get('level') if d.get('level') in LEVELS else {'TOPIK 1': 'A1', 'TOPIK 2': 'A2', 'TOPIK 3': 'B1', 'TOPIK 4': 'B2',
                 'TOPIK 5': 'C1', 'TOPIK 6': 'C2'}.get(d.get('level')) or JLPT.get(d.get('level'))
            for w in d.get('words', []):
                merge(m, w.get('w', ''), lv)
    if code == 'ja':
        for n, lv in JLPT.items():
            for r in csv.DictReader(open(f'vendor/openjlpt/vocab-{n.lower()}.csv', encoding='utf-8')):
                merge(m, r['word'], lv); merge(m, r['reading'], lv)
    if code == 'ko':
        for r in csv.reader(open('vendor/nikl/csv/어휘.csv', encoding='utf-8')):
            g = re.match(r'([1-6])급', r[2] if len(r) > 2 else '')
            if g: merge(m, nikl_word(r[3]), LEVELS[int(g.group(1)) - 1])
    if code in TATOEBA:
        for rank, w in enumerate(tatoeba_lemmas(code, root), 1):
            lv = level_of_rank(rank)
            if not lv: break
            merge(m, w, lv)
    (root / 'yardstick.json').write_text(json.dumps(m, ensure_ascii=False, separators=(',', ':')))
    print(f'{code}: {len(m)} words —', dict(Counter(m.values())))


if __name__ == '__main__':
    for c in sys.argv[1:]: build(c)
