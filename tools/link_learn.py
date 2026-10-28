#!/usr/bin/env python3
"""Link a Conversation course's units to its Learn lessons from the plan's Grammar column (2026-10-28: the Japanese
units linked none, so Learn's learning order could not follow the course). A grammar note ("past 〜ました", "に/で")
is cut into patterns; a Learn lesson matches when one of its title's patterns is the same (～ and spaces ignored).
Lessons of the JLPT level that fits the unit's CEFR level come first.

  python3 tools/link_learn.py ja docs/conversation/PLAN-ja-pt-BR.md            # report: unit → lessons
  python3 tools/link_learn.py ja docs/conversation/PLAN-ja-pt-BR.md --write    # fill empty learn: lists in src/
"""
import json, re, sys
from pathlib import Path

FIT = {'ja': {'A1': ['N5'], 'A2': ['N5', 'N4'], 'B1': ['N4', 'N3'], 'B2': ['N3', 'N2'], 'C1': ['N2', 'N1'], 'C2': ['N1']}}


# a plan's English labels → a Learn title's pattern
ALIAS = {'ja': {'い-adjectives': 'い-adjective', 'な-adjectives': 'な-adjective', 'です past': 'でした', 'plain form basics': 'た-form',
                'います/あります': 'がある・がいる', 'counters': 'Counters', 'numbers + counters': 'Counters', 'time': '時・曜日',
                'indirect no': 'の', '違います': 'ではない', 'big numbers: 万': 'Counters'}}
JP = r'[\u3040-\u30ff\u4e00-\u9fff]'


def pats(text, code='ja'):
    """the patterns of a title or a grammar note: ～ます・～ません → {ます, ません}; に/で → {に, で}; 〜て ください → {てください}"""
    for k, v in ALIAS.get(code, {}).items():
        text = text.replace(k, v)
    text = re.sub(r'\(.*?\)|（.*?）', ' ', text)
    text = re.sub(rf'({JP}|[〜～])\s+(?={JP})', r'\1', text)          # 〜て ください → 〜てください
    out = set()
    for p in re.split(r'[・/／,、;；]|\s+-\s+|\s+', text):
        p = p.strip().strip('～〜~-').strip()
        if p and re.search(r'[぀-ヿ一-鿿]', p):
            out.add(p)
    return out


def plan_rows(path):
    out, level = [], None
    for line in Path(path).read_text().splitlines():
        m = re.match(r'## (A1|A2|B1|B2|C1|C2)\b', line)
        if m: level = m.group(1); continue
        c = [x.strip() for x in line.strip().strip('|').split('|')]
        if level and len(c) >= 6 and c[0].isdigit():
            out.append((f'{level}-{c[0]}', level, c[-3]))
    return out


def main(code, plan, write=False):
    learn = json.loads((Path('data') / code / 'learn.json').read_text())
    lessons = [(lv['id'], l) for lv in learn['levels'] for t in lv['topics'] if t['kind'] == 'grammar' for l in t['lessons']]
    found, empty = {}, 0
    for unit, level, grammar in plan_rows(plan):
        want = pats(grammar)
        def match(title):
            have = pats(title if isinstance(title, str) else '')
            # the same pattern, or one the start of the other (たいです / たい), two characters at least
            return any(a == b or (min(len(a), len(b)) >= 2 and (a.startswith(b) or b.startswith(a))) for a in want for b in have)
        hits = [(lv, l) for lv, l in lessons if match(l['title'])]
        fit = FIT[code].get(level, [])
        hits.sort(key=lambda x: (x[0] not in fit, fit.index(x[0]) if x[0] in fit else 9))
        if any(lv in fit for lv, _ in hits):
            hits = [h for h in hits if h[0] in fit]           # the fitting level's lessons; far levels only as a fallback
        ids = [l['id'] for _, l in hits[:3]]
        found[unit] = ids
        empty += not ids
        print(f"{unit:7} {grammar[:34]:34} → {', '.join(f'{l['id']} {l['title'][:22]}' for _, l in hits[:3]) or '—'}")
    print(f'{len(found) - empty} of {len(found)} units linked')
    if write:
        n = 0
        for unit, ids in found.items():
            f = Path('tools/conversation') / code / 'src' / f'{unit}.yml'
            if not ids or not f.exists(): continue
            s = f.read_text()
            if re.search(r'^learn: \[\]\s*$', s, re.M):
                f.write_text(re.sub(r'^learn: \[\]\s*$', f"learn: [{', '.join(ids)}]", s, count=1, flags=re.M)); n += 1
        print(f'{n} source units written')


if __name__ == '__main__':
    main(sys.argv[1], sys.argv[2], '--write' in sys.argv)
