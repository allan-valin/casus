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


def _two(x):
    return {"en": x[0], "pt": x[1]}


def expand(src: dict, earlier: list) -> dict:
    number = int(src["id"].split("-")[1])
    level = src["id"].split("-")[0]
    items = []
    for it in src["items"]:
        if not re.fullmatch(r"[a-z0-9-]+", it[0]):
            raise ValueError(f"{src['id']}: item id {it[0]!r} must be plain ascii (a Cyrillic letter slipped in?)")
        d = {"id": it[0], "text": it[1], "meaning": {"en": it[2], "pt": it[3]}}
        if len(it) > 4 and isinstance(it[4], dict):
            d.update(it[4])
        items.append(d)
    item_text = {i["id"]: i["text"] for u in earlier for i in u["new_items"]} | {i["id"]: i["text"] for i in items}
    item_mean = {i["id"]: i["meaning"] for u in earlier for i in u["new_items"]} | {i["id"]: i["meaning"] for i in items}

    steps = [{"type": "narrator", "text": {"en": f"{src['situation'][0]} Listen to the conversation; you don't need to understand it yet.",
                                            "pt": f"{src['situation'][1]} Escute a conversa; ainda não precisa entender."}},
             {"type": "dialogue", "lines": [{"speaker": s, "text": t, "meaning": {"en": e, "pt": p}} for s, t, e, p in src["dialogue"]]}]
    asked = {}
    for b in src.get("teach", []):
        if "note" in b:
            steps.append({"type": "narrator", "text": _two(b["note"])})
        elif "pt_only" in b:
            steps.append({"type": "narrator", "for": ["pt"], "text": {"pt": b["pt_only"]}})
        elif "en_only" in b:
            steps.append({"type": "narrator", "for": ["en"], "text": {"en": b["en_only"]}})
        elif "line" in b:
            steps.append({"type": "line", "speaker": b["line"][0], "item": b["line"][1]})
        elif "build" in b:
            steps.append({"type": "buildup", "item": b["build"][0], "parts": b["build"][1]})
        elif "ask" in b:
            en, pt, answer, *ids = b["ask"]
            steps.append({"type": "prompt", "ask": {"en": en, "pt": pt}, "answer": {"speaker": "protagonist", "text": answer}, "items": ids})
            for i in ids:
                asked[i] = asked.get(i, 0) + 1
    # a second ask for every new item asked only once
    for it in items:
        m = it["meaning"]
        for _ in range(2 - min(2, asked.get(it["id"], 0))):
            steps.append({"type": "prompt", "ask": {"en": f"Once more: say “{m['en']}”.", "pt": f"Mais uma vez: diga “{m['pt']}”."},
                          "answer": {"speaker": "protagonist", "text": it["text"]}, "items": [it["id"]]})

    # reviews the schedule makes due
    order = sorted(earlier, key=lambda u: (u["level"], u["number"]))
    intro = {i["id"]: k for k, u in enumerate(order) for i in u["new_items"]}
    k = len(order)
    due = [i for i in due_reviews(intro, k) if i in item_text]
    in_steps = {i for s in steps for i in (s.get("items") or [])}
    # every earlier item a question uses is a review too, whether the schedule asks for it or not
    reused = [i for i in in_steps if i in intro and i not in due]
    reviews = [{"item": i, "from": order[intro[i]]["id"]} for i in due + sorted(reused, key=lambda x: intro[x])]
    pending = [i for i in due if i not in in_steps]
    if pending:
        steps.append({"type": "narrator", "text": {"en": "Now some things from earlier units, in this new situation.",
                                                   "pt": "Agora, coisas de unidades anteriores, nesta situação nova."}})
        # reviews stay near a quarter of the questions: due items are bundled into at most own/3 prompts, newest first
        own = sum(1 for st in steps if st["type"] == "prompt")
        pending.sort(key=lambda i: -intro[i])
        size = max(1, -(-len(pending) // max(1, own // 3)))
        groups = [pending[j:j + size] for j in range(0, len(pending), size)]
        for g in groups:
            ens = " — and “".join(item_mean[i]["en"] for i in g)
            pts = " — e “".join(item_mean[i]["pt"] for i in g)
            steps.append({"type": "prompt", "review": True,
                          "ask": {"en": f"Say: “{ens}”.", "pt": f"Diga: “{pts}”."},
                          "answer": {"speaker": "protagonist", "text": " … ".join(item_text[i] for i in g)}, "items": g})
    steps += [{"type": "narrator", "text": {"en": "Listen to the conversation again. Now you understand it.",
                                            "pt": "Escute a conversa outra vez. Agora você entende."}},
              {"type": "dialogue", "again": True}, {"type": "selfcheck"}]
    return {"id": src["id"], "level": level, "number": number, "protagonist": src["protagonist"],
            "title": _two(src["title"]), "situation": _two(src["situation"]), "learn_lessons": src.get("learn", []),
            "culture": src.get("culture", ""), "new_items": items, "reviews": reviews, "steps": steps}


def main(code: str) -> int:
    folder = ROOT / "tools" / "conversation" / code
    full = {p.stem: yaml.safe_load(p.read_text(encoding="utf-8")) for p in folder.glob("[ABC][12]-*.yml")}
    sources = {p.stem: yaml.safe_load(p.read_text(encoding="utf-8")) for p in sorted((folder / "src").glob("*.yml"))}
    for sid in sorted(sources, key=lambda s: (s[:2], int(s.split("-")[1]))):
        earlier = [u for uid, u in full.items() if (u["level"], u["number"]) < (sid[:2], int(sid.split("-")[1]))]
        unit = expand(sources[sid], earlier)
        full[sid] = unit
        header = f"# UNIT {code} {sid} — written by AI (Claude) for Casus; expanded from src/{sid}.yml by tools/expand_unit.py. Edit the source.\n\n"
        (folder / f"{sid}.yml").write_text(header + yaml.safe_dump(unit, allow_unicode=True, sort_keys=False, width=200), encoding="utf-8")
    print(f"{len(sources)} units expanded")
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv[1]))
