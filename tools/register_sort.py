#!/usr/bin/env python3
"""T2 register sort (Allan, 2026-10-27): every Learn grammar point of a Conversation language is either daily (taught
in the story) or literary/old/written-only (taught in an evening lesson inside a level-fitting story unit: a letter, a
tale, the news). Nothing is skipped. Writes the table for Allan's veto.

Japanese: the first sentence of each lesson's "Nuance & register" section decides. Korean: tools/plan_learn_map.py's
literary list. German and Macedonian: judged one by one below; everything not listed is daily.

  python3 tools/register_sort.py de mk ja ko > docs/conversation/REGISTER-2026-10-27.md
"""
import html, json, re, sys
from pathlib import Path

SKIP = re.compile(r'-(wb|wv|story|w-)')
LIT = re.compile(r'\b(written|writing|literary|literature|narration|novels?|archaic|classical|newspapers?|documents?|'
                 r'essays?|speeches|announcements|news|stiff|old-fashioned|bookish)\b', re.I)
DAY = re.compile(r'\b(conversation(al)?|casual|everyday|spoken|speech|chat|colloquial|friends|daily|everywhere|neutral)\b', re.I)

L, D = 'literary', 'daily'
MANUAL = {
    'de': {
        'de-vsp_01': (L, 'Präteritum of ordinary verbs: written narrative (spoken only in the north, and only some verbs)'),
        'de-vsp_02': (L, 'Präteritum, irregular verbs: written narrative'),
        'de-vsp_03': (L, 'Präteritum, mixed verbs: written narrative'),
        'de-vsp_04': (D, 'hatte: everyday speech'), 'de-vsp_05': (D, 'war: everyday speech'),
        'de-vm_02': (D, 'konnte, musste: everyday speech'),
        'de-adv_03': (L, 'adverbs of narration: storytelling'),
        'de-vsub_04': (L, 'Konjunktiv I: news and reports'),
        'de-c1-konj1-past': (L, 'Konjunktiv I past: news and reports'),
        'de-c1-konj1-requests': (L, 'er solle warten: reported speech in writing'),
        'de-c2-konj1-formulas': (L, 'Es lebe…, Man nehme…: fixed formulas, recipes, toasts'),
        'de-c2-extended-participle': (L, 'extended participle: newspapers, official texts'),
        'de-c2-gerundive': (L, 'die zu lösende Aufgabe: written'),
        'de-c2-impersonal-passive': (L, 'Es wurde getanzt: narration'),
        'de-c2-genitive-verbs': (L, 'gedenken + genitive: ceremonial'),
        'de-c2-concessive': (L, 'obgleich, wenngleich: elevated (selbst wenn is daily)'),
        'de-mis_05': (L, 'spelling reform: old spellings in old books'),
        'de-c1-nominal-genitive': (D, 'nominal style: office letters (daily life, written)'),
        'de-c1-funktionsverbgefuege': (D, 'zur Verfügung stellen: office and authority letters'),
        'de-c2-formal-prepositions': (D, 'zwecks, mittels: letters from authorities'),
    },
    'mk': {
        'c1-renarrative-full': (L, 'бил дошол: folk tales and retold stories'),
        'b1-verbal-adverb': (L, 'одејќи: mostly written'),
        'c1-formal': (D, 'по потпишувањето: official letters (daily life, written)'),
    },
}


def ja_register(nuance_text):
    first = re.split(r'(?<=[.!?])\s', nuance_text.strip())[0]
    lit, day = LIT.search(first), DAY.search(first)
    return (L if lit and not day else D), first[:160].replace('\n', ' ')


def points(code):
    d = json.loads((Path('data') / code / 'learn.json').read_text())
    for lv in d['levels']:
        if lv['id'] == 'Reference': continue
        for t in lv['topics']:
            if t['kind'] != 'grammar': continue
            for l in t['lessons']:
                if not SKIP.search(l['id']):
                    yield lv['id'], l


def title(l):
    t = l['title']
    return t if isinstance(t, str) else t.get('en') or next(iter(t.values()))


def sort(code):
    out = []
    if code == 'ko':
        from plan_learn_map import LITERARY
    for level, l in points(code):
        if code == 'ja':
            f = Path('data/ja/learn') / f"{l['id']}.json"
            sec = next((s for s in json.loads(f.read_text()).get('sections', []) if s['id'] == 'nuance'), None) if f.exists() else None
            if sec:
                text = html.unescape(re.sub(r'<rt>.*?</rt>|<[^>]+>', '', sec['html']['en']))
                lab, why = ja_register(text)
            else:
                lab, why = D, 'no register note (system lesson)'
        elif code == 'ko':
            lab, why = (L, 'archaic / literary ending') if title(l).strip() in LITERARY['ko'] else (D, '')
        else:
            lab, why = MANUAL.get(code, {}).get(l['id'], (D, ''))
        out.append((level, l['id'], title(l), lab, why))
    return out


def main(codes):
    print('# Register sort of Learn grammar (T2, 2026-10-27) — for Allan\'s veto\n')
    print('Daily = taught in the story. Literary = an evening lesson inside a story unit of that level (a letter, a tale,'
          ' the news): taught and recognised, never put in a character\'s mouth. Nothing is skipped. Veto: change the label'
          ' in tools/register_sort.py (de, mk), the literary list in tools/plan_learn_map.py (ko), or tell me (ja).\n')
    for code in codes:
        rows = sort(code)
        lit = [r for r in rows if r[3] == L]
        print(f'\n## {code} — {len(rows)} points: {len(rows) - len(lit)} daily, {len(lit)} literary\n')
        print('| Level | Lesson | Title | Why literary |\n|---|---|---|---|')
        for lv, i, t, _, why in lit:
            print(f'| {lv} | `{i}` | {t} | {why} |')
        print(f'\nDaily ({len(rows) - len(lit)}): ' + ', '.join(f'`{i}`' for _, i, _, lab, _ in rows if lab == D))


if __name__ == '__main__':
    main(sys.argv[1:])
