#!/usr/bin/env python3
"""IPA for every inflected form, so the pronunciation helper can compare a conjugated verb or a declined noun
(Allan, 2026-10-22: in Conversation "it does not conjugate verbs" — Wiktionary has IPA for base forms only).

How: espeak-ng writes IPA for any form (it is also what the Piper voices speak from, so this is the pronunciation the
TTS itself uses — reading it directly beats recording the voice and running a recogniser over it). Its conventions
differ from Wiktionary's (r/ʁ, ɑ/a, ɜ/ɐ, length marks, syllabic consonants), so we learn rewrite rules from the lemmas
that have both transcriptions (transformation-based learning: the rule that removes most differences, then the next),
and measure the result on lemmas held out from learning.

  python3 tools/form_ipa.py de            # writes data/de/ipa-forms/<shard>.json and data/de/ipa-rules.json

Output shards mirror data/<code>/forms/<shard>.json: { form: ipa } for forms Wiktionary has no IPA of its own for.
"""
import json, os, random, re, subprocess, sys, unicodedata
from collections import Counter, defaultdict
from pathlib import Path

ESPEAK = {'de': 'de', 'la': 'la', 'grc': 'grc', 'el': 'el', 'ru': 'ru', 'uk': 'uk', 'pl': 'pl', 'cs': 'cs', 'fi': 'fi',
          'hu': 'hu', 'tr': 'tr', 'is': 'is', 'lt': 'lt', 'ro': 'ro', 'sh': 'sr', 'mk': 'mk', 'pt': 'pt-br', 'sv': 'sv',
          'ar': 'ar', 'fr': 'fr-fr', 'it': 'it', 'es': 'es', 'en': 'en-us', 'nl': 'nl', 'hi': 'hi', 'bn': 'bn',
          'fa': 'fa', 'id': 'id', 'sw': 'sw', 'vi': 'vi', 'tl': 'tl'}
# espeak-ng connects to the sound server even with -q; thousands of connections clipped the audio of whatever else
# was playing (Allan, 2026-10-27). No server: it only writes IPA.
QUIET = {**os.environ, 'PULSE_SERVER': '/nonexistent'}
MARKS = set('ˈˌ.‿/[]()-|‖') | {'̯', '͡', '͜'}
JOIN = re.compile(r'[̀-ͯʰ-˿᷀-᷿]')   # diacritics and modifier letters stay with their letter


def segments(ipa):
    """the sounds of a transcription, the way the browser helper splits them (stress, syllable dots and ties left out)"""
    out = []
    for ch in unicodedata.normalize('NFD', ipa or ''):
        if ch in MARKS or ch.isspace():
            continue
        if out and (JOIN.match(ch) and ch not in 'ˈˌ'):
            out[-1] += ch
        else:
            out.append(ch)
    return [unicodedata.normalize('NFC', s) for s in out]


def clean_espeak(s):
    s = re.sub(r'\([a-z-]+\)', '', s)            # language-switch tags: (en)…(de)
    return s.replace('?', '').strip()


def espeak(words, voice, chunk=2000):
    """one IPA string per word; checked chunk by chunk, a chunk that does not line up goes word by word.
    One word per line, and the input ends with a newline: espeak drops the last letter of input without one, and
    several voices (mk, pl, cs, pt …) read a "." separator aloud."""
    out = []
    for i in range(0, len(words), chunk):
        part = words[i:i + chunk]
        run = lambda args, text: subprocess.run(args, input=text.encode(), capture_output=True, env=QUIET).stdout.decode('utf-8', 'replace')
        got = run(['espeak-ng', '-q', '--ipa', '-v', voice, '--stdin'], '\n'.join(part) + '\n').split()
        if len(got) != len(part):        # espeak merged or split something: this chunk word by word
            got = [run(['espeak-ng', '-q', '--ipa', '-v', voice, '--stdin'], w + '\n').strip().replace(' ', '') for w in part]
        out += [clean_espeak(g) for g in got]
    return out


def distance(a, b):
    d = list(range(len(b) + 1))
    for i, x in enumerate(a, 1):
        p, d[0] = d[0], i
        for j, y in enumerate(b, 1):
            p, d[j] = d[j], min(d[j] + 1, d[j - 1] + 1, p + (x != y))
    return d[-1]


def ops(a, b):
    n, m = len(a), len(b)
    D = [[0] * (m + 1) for _ in range(n + 1)]
    for i in range(n + 1): D[i][0] = i
    for j in range(m + 1): D[0][j] = j
    for i in range(1, n + 1):
        for j in range(1, m + 1):
            D[i][j] = min(D[i - 1][j] + 1, D[i][j - 1] + 1, D[i - 1][j - 1] + (a[i - 1] != b[j - 1]))
    i, j, out = n, m, []
    while i or j:
        if i and j and D[i][j] == D[i - 1][j - 1] + (a[i - 1] != b[j - 1]):
            out.append((i - 1, a[i - 1], b[j - 1])); i -= 1; j -= 1
        elif i and D[i][j] == D[i - 1][j] + 1:
            out.append((i - 1, a[i - 1], '')); i -= 1
        else:
            out.append((i, '', b[j - 1])); j -= 1
    return out[::-1]


def apply_rule(seq, rule):
    """rule = (left, x, right, y): x ('' = insertion point) between left and right ('' = any; '#' = word edge) → y"""
    left, x, right, y = rule
    out, i, n = [], 0, len(seq)
    def ctx_ok(i, j):
        l = seq[i - 1] if i > 0 else '#'
        r = seq[j] if j < n else '#'
        return (not left or left == l) and (not right or right == r)
    if x == '':
        for i in range(n + 1):
            if ctx_ok(i, i):
                out.append(y)
            if i < n:
                out.append(seq[i])
        return [s for s in out if s]
    while i < n:
        if seq[i] == x and ctx_ok(i, i + 1):
            if y: out.append(y)
        else:
            out.append(seq[i])
        i += 1
    return out


def learn(pairs, max_rules=30, min_gain=3):
    """pairs: [(espeak segments, wiktionary segments)] → rules, greedily, each removing the most differences"""
    rules, cur = [], [list(a) for a, _ in pairs]
    gold = [b for _, b in pairs]
    dist = [distance(a, b) for a, b in zip(cur, gold)]
    for _ in range(max_rules):
        cand = Counter()
        for a, b, d in zip(cur, gold, dist):
            if not d:
                continue
            for i, x, y in ops(a, b):
                if x == y:
                    continue
                l = a[i - 1] if i > 0 else '#'
                r = (a[i + 1] if i + 1 < len(a) else '#') if x else (a[i] if i < len(a) else '#')
                for c in ((('', x, '', y)) if x else None, (l, x, '', y), ('', x, r, y), (l, x, r, y)):
                    if c: cand[c] += 1
        best, gain_best = None, 0
        for c, _ in cand.most_common(60):
            gain = 0
            for k, (a, b) in enumerate(zip(cur, gold)):
                if c[1] and c[1] not in a:
                    continue
                gain += dist[k] - distance(apply_rule(a, c), b)
            if gain > gain_best:
                best, gain_best = c, gain
        if not best or gain_best < min_gain:
            break
        rules.append(best)
        cur = [apply_rule(a, best) for a in cur]
        dist = [distance(a, b) for a, b in zip(cur, gold)]
    return rules


def per(pairs, rules):
    tot = err = exact = 0
    for a, b in pairs:
        for r in rules: a = apply_rule(a, r)
        e = distance(a, b); tot += len(b); err += e; exact += e == 0
    return 100 * err / max(tot, 1), 100 * exact / max(len(pairs), 1)


def main(code):
    voice = ESPEAK.get(code)
    if not voice:
        sys.exit(f'no espeak voice known for {code}')
    root = Path('data') / code
    ipa = json.loads((root / 'ipa.json').read_text())
    lemmas = json.loads((root / 'lemmas.json').read_text())
    WORD = re.compile(r"^[\w'’-]+$")
    pairs = [(lemmas[k]['headword'], v[0]['ipa']) for k, v in ipa.items()
             if k in lemmas and v and WORD.match(lemmas[k]['headword']) and v[0]['ipa'][:1] in '/[']
    random.seed(7)
    random.shuffle(pairs)
    pairs = pairs[:3000]
    got = espeak([w for w, _ in pairs], voice)
    seg = [(segments(g), segments(w)) for g, (_, w) in zip(got, pairs)]
    cut = 2000 if len(seg) >= 3000 else (2 * len(seg)) // 3
    train, test = seg[:cut], seg[cut:]
    rules = learn(train) if len(test) >= 150 else []
    if len(test) < 150:
        print(f'{code}: only {len(seg)} lemmas with IPA — not calibrated (raw espeak notation)')
    raw, raw_ex = per(test, [])
    cal, cal_ex = per(test, rules)
    print(f'{code}: {len(rules)} rules; held-out {len(test)} lemmas: phone disagreement {raw:.1f}% → {cal:.1f}%, exact {raw_ex:.1f}% → {cal_ex:.1f}%')
    (root / 'ipa-rules.json').write_text(json.dumps({'voice': voice, 'rules': rules, 'heldOut': len(test),
        'raw': round(raw, 1), 'calibrated': round(cal, 1), 'exactRaw': round(raw_ex, 1), 'exact': round(cal_ex, 1)}, ensure_ascii=False))
    known = {lemmas[k]['headword'].lower() for k, v in ipa.items() if k in lemmas and v}
    outdir = root / 'ipa-forms'
    outdir.mkdir(exist_ok=True)
    total = 0
    for f in sorted((root / 'forms').glob('*.json')):
        forms = [w for w in json.loads(f.read_text()) if WORD.match(w) and w.lower() not in known]
        if not forms:
            (outdir / f.name).write_text('{}'); continue
        out = {}
        for w, g in zip(forms, espeak(forms, voice)):
            s = segments(g)
            for r in rules: s = apply_rule(s, r)
            if s: out.setdefault(w.lower(), ''.join(s))
        total += len(out)
        (outdir / f.name).write_text(json.dumps(out, ensure_ascii=False, separators=(',', ':')))
    print(f'{code}: {total} forms transcribed into {outdir}')


if __name__ == '__main__':
    for c in sys.argv[1:]:
        main(c)
