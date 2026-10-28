"""
Vowel marks for Arabic Learn examples, so the page can show Latin letters under them (Allan, 2026-10-28: "a false
vowel is better than no vowel"). Tatoeba's Arabic is written without vowels and the romaniser needs them.

Each word takes Wiktionary's vowelling when its spelling has only one (176k spellings; also after al-, wa-, fa-, bi-,
li-), the rest the open diacritiser Mishkal (GPL-3, build time only, nothing of it ships). Measured 2026-10-28 on
vowelled text with the vowels taken out (case endings not counted): Mishkal alone 74 % of words right on our lessons'
Arabic, 68 % on Wiktionary's example sentences; with the dictionary first 77 % and 73 %.

Writes `vowelled` beside `text` on every example of data/ar/learn/ar-*.json (examples and more) and on every
exercise prompt of q-ar-*.json; the text shown stays as Tatoeba wrote it. Run with the python that has mishkal (desembarque/.venv-ocr):
    python tools/ar_vowel.py            # builds the Wiktionary list from vendor/wiktextract on the first run
"""
import gzip
import json
import re
import sys
import unicodedata
from collections import Counter, defaultdict
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
LEXICON = ROOT / 'vendor' / 'wiktextract' / 'ar-vowelling.json'
MARKS = re.compile('[ً-ْٰ]')
SUN = set('تثدذرزسشصضطظلن')
# short words with one reading (not من: min 'from' or man 'who') whose last vowel is part of the word, not a case ending, and which Wiktionary spells several ways
FIXED = {'هي': 'هِيَ', 'هو': 'هُوَ', 'أنا': 'أَنَا', 'أنت': 'أَنْتَ', 'نحن': 'نَحْنُ', 'هم': 'هُمْ', 'هذا': 'هٰذَا', 'هذه': 'هٰذِهِ',
         'ذلك': 'ذٰلِكَ', 'تلك': 'تِلْكَ', 'في': 'فِي', 'على': 'عَلَى', 'إلى': 'إِلَى', 'مع': 'مَعَ', 'لا': 'لَا', 'ما': 'مَا'}
CLITICS = (('و', 'وَ'), ('ف', 'فَ'), ('ب', 'بِ'), ('ل', 'لِ'), ('', ''))


def bare(w):
    return MARKS.sub('', w.replace('ٱ', 'ا'))


def build_lexicon():
    """bare spelling -> its one vowelling (marks on the last letter dropped: the case ending is the sentence's)"""
    seen = defaultdict(Counter)
    with gzip.open(ROOT / 'vendor' / 'wiktextract' / 'kaikki.org-dictionary-Arabic.jsonl.gz', 'rt') as f:
        for line in f:
            e = json.loads(line)
            for w in [e.get('word', '')] + [x.get('form', '') for x in e.get('forms', []) if 'romanization' not in x.get('tags', [])]:
                if w and re.fullmatch('[ء-ْٰٱ]+', w) and MARKS.search(w):
                    seen[bare(w)][re.sub('[ً-ْ]+$', '', w.replace('ٱ', 'ا'))] += 1
    return {k: next(iter(c)) for k, c in seen.items() if len(c) == 1}


def from_lexicon(b, lex):
    if b in lex:
        return lex[b]
    for pre, pv in CLITICS:
        if b.startswith(pre + 'ال') and len(b) > len(pre) + 3 and b[len(pre) + 2:] in lex:
            r = lex[b[len(pre) + 2:]]
            return pv + ('ال' + r[0] + 'ّ' + r[1:] if r[0] in SUN else 'الْ' + r)
    for pre, pv in CLITICS[:-1]:
        if b.startswith(pre) and b[1:] in lex:
            return pv + lex[b[1:]]
    return None


def vowel(text, lex, diac):
    """the sentence with vowels: a word already vowelled stays, the dictionary's next, the diacritiser's last"""
    words = text.split()
    guessed = diac(bare(text)).split()   # a stray mark (a lone tanwin) makes Mishkal leave the word bare
    if len(guessed) != len(words):
        guessed = [diac(bare(w)).strip() for w in words]
    out = []
    for w, g in zip(words, guessed):
        m = re.fullmatch(r'([^ء-ي]*)([ء-ْٰٱ]+)([^ء-ي]*)', w)
        if not m:
            out.append(g if re.search('[\u0621-\u064a]', w) else w)   # a gap (＿＿) or a number stays as it is
            continue
        lead, core, tail = m.groups()
        if len(MARKS.findall(core)) * 2 >= len(bare(core)):
            out.append(w)
            continue
        known = FIXED.get(bare(core)) or from_lexicon(bare(core), lex)
        guess = re.sub(r'[^\u0621-\u0652\u0670\u0671]', '', g)
        word = known or (guess if bare(guess) == bare(core) else core)
        if bare(core) not in FIXED:   # read in pause, as Wiktionary romanises: no case ending, -an kept
            word = re.sub('[\u064b-\u0652]+$', lambda m: ''.join(c for c in m.group() if c in '\u064b\u0651'), word)
        out.append(lead + word + tail)
    return unicodedata.normalize('NFC', ' '.join(out))


def main():
    if LEXICON.exists():
        lex = json.loads(LEXICON.read_text())
    else:
        lex = build_lexicon()
        LEXICON.write_text(json.dumps(lex, ensure_ascii=False))
    import mishkal.tashkeel
    diac = mishkal.tashkeel.TashkeelClass().tashkeel
    n = 0
    for f in sorted((ROOT / 'data' / 'ar' / 'learn').glob('ar-*.json')):
        lesson = json.loads(f.read_text())
        for ex in lesson.get('examples', []) + (lesson.get('more') or []):
            ex['vowelled'] = vowel(ex['text'], lex, diac)
            n += 1
        f.write_text(json.dumps(lesson, ensure_ascii=False))
    # the exercises: the prompt's text (a gap question keeps its ＿＿)
    for f in sorted((ROOT / 'data' / 'ar' / 'learn').glob('q-ar-*.json')):
        qs = json.loads(f.read_text())
        for q in qs.get('qs', []):
            text = ''.join(t for t, _ in q.get('furi') or []) or q.get('prompt', '')
            if re.search('[\u0621-\u064a]', text):
                q['vowelled'] = vowel(text, lex, diac)
                n += 1
        f.write_text(json.dumps(qs, ensure_ascii=False))
    print(f'{n} examples vowelled', file=sys.stderr)


if __name__ == '__main__':
    main()
