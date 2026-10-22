#!/usr/bin/env python3
"""Expands a compact conversation unit into the full format (Allan, 2026-10-21: "make the rest of the 178 lessons").

The writer (AI, Claude) writes what needs judgement — the scene, new items, dialogue, explanations, the questions in
context, build-ups, culture notes — in a compact source (tools/conversation/<code>/src/<LEVEL>-<NN>.yml). This adds the
bookkeeping the guide demands: the opening, a second ask for every new item asked only once, review prompts for the items
the doubling schedule makes due (back 1, 3, 7, 15, 31… units after they were introduced), the dialogue again and the
self-check. tools/conversation_check.py then checks the result like any hand-written unit.

    python3 tools/expand_unit.py mk            # every src/*.yml → <code>/<id>.yml (hand-written units are kept)

Source format (lists keep it short):
    id, protagonist (f|m), title: [en, pt], situation: [en, pt], learn: [...], culture: "…"
    items:    - [id, text, en, pt]            optional 5th: {rare: true, register: formal}
    dialogue: - [speaker, text, en, pt]
    teach:    - note: [en, pt]               narration for everyone
              - pt_only: "…"                 a comparison with Brazil (Portuguese narrator only)
              - en_only: "…"                 a note for the neutral English version only
              - line: [speaker, item]
              - build: [item, [parts…]]
              - ask: [en, pt, answer, item, item…]
"""
from __future__ import annotations

import re
import sys
from pathlib import Path

import yaml

ROOT = Path(__file__).resolve().parents[1]
OFFSETS = (1, 3, 7, 15, 31, 63, 127)


def due_reviews(intro: dict, k: int) -> list:
    """items introduced at unit index k0 come back at k0+1, +3, +7, +15… (each within double the last gap)"""
    return [i for i, k0 in intro.items() if (k - k0) in OFFSETS]


# the bookkeeping sentences, per narrator language; Arabic addresses the listener by the unit's form (f / m), Macedonian
# with the polite Вие (the M audience is an older couple). Quotes are “…” / „…“, never «…», which marks taught words.
TEMPLATES = {
    "en": {"open": "{s} Listen to the conversation; you don't need to understand it yet.",
           "again": "Listen to the conversation again. Now you understand it.", "once": "Once more: say “{m}”.",
           "reviews": "Now some things from earlier units, in this new situation.", "say": "Say: “{m}”.", "join": " — and “"},
    "pt": {"open": "{s} Escute a conversa; ainda não precisa entender.",
           "again": "Escute a conversa outra vez. Agora você entende.", "once": "Mais uma vez: diga “{m}”.",
           "reviews": "Agora, coisas de unidades anteriores, nesta situação nova.", "say": "Diga: “{m}”.", "join": " — e “"},
    "ar": {"f": {"open": "{s} استمعي إلى المحادثة؛ لا داعي لأن تفهميها الآن.",
                 "again": "استمعي إلى المحادثة مرة أخرى. الآن تفهمينها.", "once": "مرة أخرى: قولي “{m}”.",
                 "reviews": "والآن بعض ما تعلمتِه في الوحدات السابقة، في هذا الموقف الجديد.", "say": "قولي: “{m}”.", "join": " — و“"},
           "m": {"open": "{s} استمع إلى المحادثة؛ لا داعي لأن تفهمها الآن.",
                 "again": "استمع إلى المحادثة مرة أخرى. الآن تفهمها.", "once": "مرة أخرى: قل “{m}”.",
                 "reviews": "والآن بعض ما تعلمتَه في الوحدات السابقة، في هذا الموقف الجديد.", "say": "قل: “{m}”.", "join": " — و“"}},
    "mk": {"open": "{s} Слушнете го разговорот; уште не мора да го разберете.",
           "again": "Слушнете го разговорот уште еднаш. Сега го разбирате.", "once": "Уште еднаш: кажете „{m}“.",
           "reviews": "Сега нешто од претходните лекции, во оваа нова ситуација.", "say": "Кажете: „{m}“.", "join": "“ — и „"},
}


def _tpl(lang, form, key, **kw):
    t = TEMPLATES[lang]
    t = t.get(form, t) if "f" in t else t
    return t[key].format(**kw)


def _say(lang, form, means):
    t = TEMPLATES[lang]
    t = t.get(form, t) if "f" in t else t
    return t["say"].format(m=t["join"].join(means))


def _texts(x, langs):
    """a list in the narrator languages' order, or a dict"""
    if isinstance(x, dict):
        return {l: x[l] for l in langs if l in x}
    return dict(zip(langs, x))


def _visible(u, lang):
    return not u.get("tracks") or lang in u["tracks"]


def expand(src: dict, earlier: list, langs=("en", "pt")) -> dict:
    number = int(src["id"].split("-")[1])
    level = src["id"].split("-")[0]
    langs = [l for l in langs if not src.get("tracks") or l in src["tracks"]]
    n = len(langs)
    form = src["protagonist"]
    # an audience version's own items carry its audience letters (-e, -a, -m), so a later core unit teaching the same
    # word to everyone never collides with it (Allan's German course, 2026-10-22)
    suffix = "-" + "".join(l[0] for l in langs) if src.get("tracks") else ""
    own = {it[0]: f"{it[0]}{suffix}" for it in src["items"] if isinstance(it[0], str)}
    rename = lambda i: own.get(i, i)
    items = []
    for it in src["items"]:
        if not isinstance(it[0], str) or not re.fullmatch(r"[a-z0-9-]+", it[0]):   # YAML reads a bare no/yes/on as a boolean
            raise ValueError(f"{src['id']}: item id {it[0]!r} must be plain ascii (a Cyrillic letter slipped in?)")
        d = {"id": rename(it[0]), "text": it[1], "meaning": _texts(it[2], langs) if isinstance(it[2], dict) else dict(zip(langs, it[2:2 + n]))}
        extra = it[3] if isinstance(it[2], dict) else (it[2 + n] if len(it) > 2 + n else None)
        if isinstance(extra, dict):
            d.update(extra)
        items.append(d)
    item_text = {i["id"]: i["text"] for u in earlier for i in u["new_items"]} | {i["id"]: i["text"] for i in items}
    item_mean = {}
    for u in earlier:
        for i in u["new_items"]:
            item_mean.setdefault(i["id"], {}).update(i["meaning"])
    item_mean |= {i["id"]: i["meaning"] for i in items}

    situation = _texts(src["situation"], langs)
    steps = [{"type": "narrator", "text": {l: _tpl(l, form, "open", s=situation[l]) for l in langs}},
             {"type": "dialogue", "lines": [{"speaker": d[0], "text": d[1],
                                             "meaning": _texts(d[2], langs) if isinstance(d[2], dict) else dict(zip(langs, d[2:2 + n]))}
                                            for d in src["dialogue"]]}]
    asked = {}
    for b in src.get("teach", []):
        if "note" in b:
            steps.append({"type": "narrator", "text": _texts(b["note"], langs)})
        elif "pt_only" in b:
            steps.append({"type": "narrator", "for": ["pt"], "text": {"pt": b["pt_only"]}})
        elif "en_only" in b:
            steps.append({"type": "narrator", "for": ["en"], "text": {"en": b["en_only"]}})
        elif "only" in b:   # {ar: "…", mk: "…"}: one note for some audiences
            steps.append({"type": "narrator", "for": [l for l in langs if l in b["only"]], "text": {l: b["only"][l] for l in langs if l in b["only"]}})
        elif "line" in b:
            steps.append({"type": "line", "speaker": b["line"][0], "item": rename(b["line"][1])})
        elif "build" in b:
            steps.append({"type": "buildup", "item": rename(b["build"][0]), "parts": b["build"][1]})
        elif "ask" in b:
            a = b["ask"]
            if isinstance(a[0], dict):
                ask, answer, ids = _texts(a[0], langs), a[1], a[2:]
            else:
                ask, answer, ids = dict(zip(langs, a[:n])), a[n], a[n + 1:]
            ids = [rename(i) for i in ids]
            steps.append({"type": "prompt", "ask": ask, "answer": {"speaker": "protagonist", "text": answer}, "items": ids})
            for i in ids:
                asked[i] = asked.get(i, 0) + 1
    # a second ask for every new item asked only once
    for it in items:
        m = it["meaning"]
        for _ in range(2 - min(2, asked.get(it["id"], 0))):
            steps.append({"type": "prompt", "ask": {l: _tpl(l, form, "once", m=m[l]) for l in langs},
                          "answer": {"speaker": "protagonist", "text": it["text"]}, "items": [it["id"]]})

    # reviews the schedule makes due, per audience (a version for one audience has its own past)
    in_steps = {i for s in steps for i in (s.get("items") or [])}
    due_for, intro_at, src_of = {}, {}, {}
    for l in langs:
        order = sorted([u for u in earlier if _visible(u, l)], key=lambda u: (u["level"], u["number"]))
        intro = {}
        for k, u in enumerate(order):
            for i in u["new_items"]:
                intro.setdefault(i["id"], k)
                src_of.setdefault(i["id"], u["id"])
        for i in due_reviews(intro, len(order)):
            if i in item_text:
                due_for.setdefault(i, []).append(l)
                intro_at[i] = max(intro_at[i], intro[i] - len(order)) if i in intro_at else intro[i] - len(order)
        for i in in_steps:
            if i in intro:
                intro_at.setdefault(i, intro[i] - len(order))
    due = list(due_for)
    reused = [i for i in in_steps if i in intro_at and i not in due]
    reviews = []
    for i in due + sorted(reused, key=lambda x: (intro_at[x], x)):
        r = {"item": i, "from": src_of[i]}
        if i in due_for and len(due_for[i]) < len(langs):
            r["for"] = due_for[i]
        reviews.append(r)
    pending = [i for i in due if i not in in_steps]
    if pending:
        steps.append({"type": "narrator", "text": {l: _tpl(l, form, "reviews") for l in langs}})
        # reviews stay near a quarter of the questions: due items are bundled into at most own/3 prompts, newest first
        own = sum(1 for st in steps if st["type"] == "prompt")
        groups = {}
        for i in pending:
            groups.setdefault(tuple(due_for[i]), []).append(i)
        # an audience may see several groups (its own and the shared one): they share its budget
        seen = {l: sum(1 for who in groups if l in who) for l in langs}
        for who, group in groups.items():
            budget = max(1, min(-(-(own // 3) // seen[l]) for l in who))
            group.sort(key=lambda i: -intro_at[i])
            size = max(1, -(-len(group) // budget))
            for j in range(0, len(group), size):
                g = group[j:j + size]
                st = {"type": "prompt", "review": True,
                      "ask": {l: _say(l, form, [item_mean[i][l] for i in g]) for l in who},
                      "answer": {"speaker": "protagonist", "text": " … ".join(item_text[i] for i in g)}, "items": g}
                if len(who) < len(langs):
                    st = {**st, "for": list(who)}
                steps.append(st)
    steps += [{"type": "narrator", "text": {l: _tpl(l, form, "again") for l in langs}},
              {"type": "dialogue", "again": True}, {"type": "selfcheck"}]
    out = {"id": src["id"], "level": level, "number": number, "protagonist": src["protagonist"]}
    if src.get("tracks"):
        out["tracks"] = langs
    return out | {"title": _texts(src["title"], langs), "situation": situation, "learn_lessons": src.get("learn", []),
                  "culture": src.get("culture", ""), "new_items": items, "reviews": reviews, "steps": steps}


def main(code: str) -> int:
    folder = ROOT / "tools" / "conversation" / code
    full = {p.stem: yaml.safe_load(p.read_text(encoding="utf-8")) for p in folder.glob("[ABC][12]-*.yml")}
    sources = {p.stem: yaml.safe_load(p.read_text(encoding="utf-8")) for p in sorted((folder / "src").glob("*.yml"))}
    langs = yaml.safe_load((folder / "story-bible.yml").read_text(encoding="utf-8"))["narrator_languages"]
    for sid in sorted(sources, key=lambda s: (s[:2], int(s.split("-")[1]), s)):
        earlier = [u for uid, u in full.items() if (u["level"], u["number"]) < (sid[:2], int(sid.split("-")[1]))]
        unit = expand(sources[sid], earlier, langs)
        full[sid] = unit
        header = f"# UNIT {code} {sid} — written by AI (Claude) for Casus; expanded from src/{sid}.yml by tools/expand_unit.py. Edit the source.\n\n"
        (folder / f"{sid}.yml").write_text(header + yaml.safe_dump(unit, allow_unicode=True, sort_keys=False, width=200), encoding="utf-8")
    print(f"{len(sources)} units expanded")
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv[1]))
