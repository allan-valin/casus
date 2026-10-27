#!/usr/bin/env python3
"""Every Learn grammar point of a language placed in a unit of its Conversation plan (Allan, 2026-10-27: the Korean
plan "assuming all grammar from Learn is used"; T1/T2: nothing skipped, literary points become evening lessons).

A point whose form the plan's Grammar column already names stays there; the rest are spread evenly over the level's
units in Learn order (core lessons and the NIKL list each spread on their own, so both run easy → hard). Wikibooks chapters, stories and vocabulary are not grammar points.

  python3 tools/plan_learn_map.py ko docs/conversation/PLAN-ko-pt-BR.md   # Markdown table per level on stdout
"""
import json, re, sys
from pathlib import Path

LEVELS = {'ko': ['A1', 'A2', 'B1', 'B2', 'C1', 'C2']}          # TOPIK 1–6 → the plan's CEFR sections
GRAMMAR_ID = {'ko': re.compile(r'^ko-(?!wb|wv|story|w-)')}      # core lessons and the NIKL basic grammar list
# literary, archaic or written-only endings: taught as an evening lesson inside a story unit (T2), not in dialogue
LITERARY = {'ko': {'-노라면', '-으리오', '-으리라', '-건대', '-되', '-디', '-거들랑', '-거들랑2', '-은들', '-을망정,',
                   '-으련마는', '-기로서니', '-으오', '-소', '-구려', '-그려', '-는구려', '-이라야', '-을라치면', '-거라',
                   '-으리라는', '-으리라고', '-느니만큼', '-자니', '-을랑', '깨나', '마는', '-더라', '-더군', '-어라'}}


def plan_units(path):
    """{level: [(number, title, grammar)]} from the plan's tables"""
    out, level = {}, None
    for line in Path(path).read_text().splitlines():
        m = re.match(r'## (A1|A2|B1|B2|C1|C2)\b', line)
        if m: level = m.group(1); out[level] = []; continue
        cells = [c.strip() for c in line.strip().strip('|').split('|')]
        if level and len(cells) >= 6 and cells[0].isdigit():
            out[level].append((cells[0], cells[2], cells[-3]))
    return out


def forms(title):
    return [f.strip() for f in re.split(r'[,/]', re.sub(r'\(.*?\)', '', title)) if len(f.strip().strip('-')) >= 2]


def main(code, plan):
    learn = json.loads((Path('data') / code / 'learn.json').read_text())
    units = plan_units(plan)
    for lv, name in zip(learn['levels'], LEVELS[code]):
        rows = units.get(name, [])
        if not rows: continue
        placed = {n: [] for n, _, _ in rows}
        points = [l for t in lv['topics'] if t['kind'] == 'grammar' for l in t['lessons'] if GRAMMAR_ID[code].match(l['id'])]
        rest = []
        for p in points:
            home = next((n for n, _, g in rows if (len(p['title'].strip().strip('-')) >= 2 and p['title'].strip() in g) or any(f in g for f in forms(p['title']))), None)
            if home: placed[home].append(p)
            else: rest.append(p)
        for group in ([p for p in rest if '-nikl-' not in p['id']], [p for p in rest if '-nikl-' in p['id']]):
            for i, p in enumerate(group):
                placed[rows[i * len(rows) // max(len(group), 1)][0]].append(p)
        print(f'\n### {name} — {len(points)} Learn points ({lv["id"]})\n')
        print('| # | Unit | Learn points (ids) | Evening lesson (literary) |\n|---|---|---|---|')
        for n, title, _ in rows:
            day = [p for p in placed[n] if p['title'].strip() not in LITERARY[code]]
            eve = [p for p in placed[n] if p['title'].strip() in LITERARY[code]]
            fmt = lambda ps: ', '.join(f"{p['title'].strip()} `{p['id']}`" for p in ps) or '—'
            print(f'| {n} | {title} | {fmt(day)} | {fmt(eve)} |')


if __name__ == '__main__':
    main(sys.argv[1], sys.argv[2])
