#!/usr/bin/env python3
"""T4 (Allan, 2026-10-27): every Conversation line in the speech style the story bible gives that relationship.

The bible's cast `register` (formal / informal) is the default both ways; `formality.relationships` entries
({from, to, style, from_unit}) change it from a unit on (style "any": both are natural, e.g. an elder or a boss speaking down), also one way only (a Korean grandmother may drop to 반말 while
the protagonist never does). A line's style is read from its words — heuristics, so the findings are warnings:
  de  du/dich/dir/dein… vs Sie/Ihnen/Ihr… not at the sentence start
  mk  ти/те/тебе/твој… vs вие/ви/ве/ваш…
  ja  です・ます forms vs a plain ending        ko  -요/-니다 vs no polite ending
Only two-speaker dialogues are judged (each line is addressed to the other speaker).

  python3 tools/register_check.py de mk ja ko      # findings per language
"""
import re, sys
from pathlib import Path

STYLE = {'formal': 'formal', 'informal': 'informal', '해요체': 'formal', '합쇼체': 'formal', '반말': 'informal',
         'du': 'informal', 'sie': 'formal', 'ти': 'informal', 'вие': 'formal', 'plain': 'informal', 'polite': 'formal'}
RUBY = re.compile(r'\[[^\]]*\]')
JA_SET = re.compile(r'(こんにちは|こんばんは|はじめまして|すみません|ありがとう|おはよう|いただきます|ごちそうさま|お疲れ様|おつかれさま|よろしく|さようなら|おやすみ|失礼します|いらっしゃいませ|なさい|ただいま|おかえり|いってきます|いってらっしゃい|おめでとう|どうぞ|どうも|はい|いいえ|ええ)$')
# a plain-style ending: copula, sentence particles, plain verb and adjective forms
JA_PLAIN = re.compile(r'(だ|だよ|だね|だな|だった|じゃない|じゃん|よね|かな|って|ないよ|たよ|るよ|ない|なかった|た|る|う|く|ぶ|む|つ|ぐ|す|い|ろ|て|の|よ|ね)$')


def style_of(code, text):
    t = re.sub(r'[„“"«»「『][^„“"«»」』]*[“"»」』]', ' ', RUBY.sub('', text or '')).strip()   # quoted speech or letters: someone else's words
    t = re.sub(r'[„“"«「『][^„“"«»」』]*$', ' ', t).strip()            # a letter quoted to the end of the line
    if code in ('ko', 'ja'):                          # a trailing name or title: …, 할머니 / …, 팀장님 / …、鈴木さん
        t = re.sub(r'[,、]\s*\S{0,8}(님|씨|할머니|할아버지|형|누나|언니|오빠|さん|くん|ちゃん|様|先生|課長|部長)[!！?？.。]*$', '', t).strip() or t
    if code == 'ja': t = t.replace(' ', '')
    if code == 'de':
        inf = re.search(r'\b(du|dich|dir|dein\w*)\b', t, re.I)
        frm = re.search(r'(?<![.!?:]\s)(?<!^)\b(Sie|Ihnen|Ihr|Ihre\w*)\b', t)
    elif code == 'mk':
        inf = re.search(r'(?<!\w)(ти|те|тебе|твој\w*|твоја|твое|твои)(?!\w)', t, re.I)
        frm = re.search(r'(?<!\w)(вие|ви|ве|ваш\w*|ваша|ваше|ваши)(?!\w)', t, re.I)
    elif code in ('ja', 'ko'):
        ends = [s for s in re.split(r'[。！？!?.\n]+', t) if s.strip()]
        if not ends: return None
        polite = re.compile(r'(です|ます|でした|ました|ません|ましょう|ください|ございます|ませんか)[よねか]*$' if code == 'ja'
                            else r'(요|니다|니까|세요|십시오|죠)$')
        last = re.sub(r'[\s、,…~〜」』）)]+$', '', ends[-1])
        if polite.search(last): return 'formal'
        if code == 'ja':
            if JA_SET.search(last): return None                  # greetings and set phrases: no speech level of their own
            return 'informal' if JA_PLAIN.search(last) else None
        if code == 'ko' and len(last) <= 2: return None
        return 'informal'
    else:
        return None
    if inf and frm: return None
    return 'informal' if inf else 'formal' if frm else None


def _key(unit):
    m = re.match(r'([ABC][12])-(\d+)', unit or '')
    return (m.group(1), int(m.group(2))) if m else ('Z9', 0)


def expected_style(bible, speaker, to, unit):
    cast = {c['id']: c for c in bible.get('cast', [])}
    other = to if speaker == 'protagonist' else speaker
    style = STYLE.get(str(cast.get(other, {}).get('register', '')).lower())
    best = None
    for r in (bible.get('formality') or {}).get('relationships', []) or []:
        if r.get('from') == speaker and r.get('to') == to and _key(r.get('from_unit')) <= _key(unit):
            if best is None or _key(r['from_unit']) >= _key(best['from_unit']):
                best = r
    if best: style = 'any' if best['style'] == 'any' else STYLE.get(str(best['style']).lower(), style)
    return style


def unit_findings(code, unit, bible):
    out = []
    for n, s in enumerate(unit.get('steps', []), 1):
        if s.get('type') != 'dialogue' or not s.get('lines'): continue
        who = {l.get('speaker') for l in s['lines']}
        if len(who) != 2: continue
        for l in s['lines']:
            to = next(w for w in who if w != l.get('speaker'))
            want, got = expected_style(bible, l.get('speaker'), to, unit['id']), style_of(code, l.get('text'))
            if want and want != 'any' and got and want != got:
                out.append(f"{unit['id']} step {n}: {l.get('speaker')} → {to} should be {want}, sounds {got}: {l.get('text')}")
    return out


def main(codes):
    import yaml
    for code in codes:
        folder = Path('tools/conversation') / code
        bible = yaml.safe_load((folder / 'story-bible.yml').read_text())
        found = []
        for f in sorted(folder.glob('[ABC][12]-*.yml')):
            found += unit_findings(code, yaml.safe_load(f.read_text()) or {}, bible)
        print(f'== {code}: {len(found)} lines in an unexpected style')
        for x in found: print('  ' + x)


if __name__ == '__main__':
    main(sys.argv[1:])
