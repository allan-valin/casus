"""Check Conversation practice files against the writing rules in docs/conversation/GUIDE.*.md.

    python3 tools/conversation_check.py tools/conversation/<code>

A language folder holds story-bible.yml and one file per unit (A1-01.yml, A1-02.yml, …). Errors break a rule the
guide states; warnings are sizes and shares the guide gives as targets (15–30 new items, an 8–10-line dialogue,
about a quarter review)."""
import re
import sys
from pathlib import Path

import yaml

STEP_TYPES = {"narrator", "dialogue", "line", "prompt", "buildup", "selfcheck"}
LEVELS = {"A1", "A2", "B1", "B2", "C1", "C2"}
NEW_ITEMS = (10, 20)            # Allan 2026-10-21: the pace of the classic audio courses (its German I reaches modals + weil in 30 units)
DIALOGUE_LINES = (8, 10)
REVIEW_SHARE = (0.15, 0.40)


def _missing_langs(field, langs):
    return [l for l in langs if not (isinstance(field, dict) and str(field.get(l) or "").strip())]


def check_bible(b):
    errors = []
    for key in ("language", "narrator_languages", "country", "standard", "voices", "protagonist", "cast", "formality", "culture"):
        if not b.get(key):
            errors.append(f"bible: missing {key}")
    if errors:
        return errors
    langs = b["narrator_languages"]
    voices = {v["id"]: v for v in b["voices"]}
    for l in langs:
        if not any(v.get("role") == "narrator" and v.get("lang") == l for v in voices.values()):
            errors.append(f"bible: no narrator voice for {l}")
    for form, voice in (b["protagonist"].get("forms") or {}).items():
        if voice not in voices:
            errors.append(f"bible: protagonist form {form} uses undeclared voice {voice}")
    if not b["protagonist"].get("forms"):
        errors.append("bible: protagonist has no forms")
    for c in b["cast"]:
        for key in ("id", "name", "role", "voice", "register"):
            if not c.get(key):
                errors.append(f"bible: cast member {c.get('id', '?')} missing {key}")
        if c.get("voice") and c["voice"] not in voices:
            errors.append(f"bible: cast member {c.get('id')} uses undeclared voice {c['voice']}")
    culture = b["culture"]
    if not culture.get("taught"):
        errors.append("bible: no culture notes for the taught country")
    for l in langs:
        if not any(n.get("lang") == l for n in culture.get("narrator") or []):
            errors.append(f"bible: no culture notes for the narrator language {l}")
    if not culture.get("clashes"):
        errors.append("bible: no clashes (situations where the two cultures expect different things)")
    if not (b["formality"].get("rules")):
        errors.append("bible: formality has no rules")
    return errors


def _suffix_chain(parts, whole):
    norm = [re.sub(r"^[-–…\.\s]+", "", p).strip().lower() for p in parts]
    return bool(norm) and norm[-1] == whole.strip().lower() and all(b.endswith(a) for a, b in zip(norm, norm[1:]))


def check_unit(u, b):
    errors, warnings = [], []
    uid = u.get("id", "?")
    for key in ("id", "level", "number", "title", "situation", "protagonist", "new_items", "steps"):
        if key not in u:
            errors.append(f"{uid}: missing {key}")
    if errors:
        return errors, warnings
    # a unit for some audiences only (tracks) needs only their narrator languages (Allan, 2026-10-21)
    langs = [l for l in b["narrator_languages"] if not u.get("tracks") or l in u["tracks"]]
    speakers = {c["id"] for c in b["cast"]} | {"protagonist"}
    if u["level"] not in LEVELS:
        errors.append(f"{uid}: level {u['level']} is not a CEFR level")
    for key in ("title", "situation"):
        for l in _missing_langs(u[key], langs):
            errors.append(f"{uid}: {key} lacks narrator language {l}")
    if u["protagonist"] not in (b["protagonist"].get("forms") or {}):
        errors.append(f"{uid}: protagonist form {u['protagonist']} is not in the bible")

    new = {i["id"]: i for i in u["new_items"]}
    for i in u["new_items"]:
        if not str(i.get("text") or "").strip():
            errors.append(f"{uid}: item {i['id']} has no text")
        for l in _missing_langs(i.get("meaning"), langs):
            errors.append(f"{uid}: item {i['id']} lacks a meaning in {l}")
    reviewed = {r["item"] for r in u.get("reviews") or []}
    allowed = set(new) | reviewed

    prompted, review_prompts, prompts = {}, 0, 0
    for n, s in enumerate(u["steps"], 1):
        t = s.get("type")
        where = f"{uid} step {n}"
        if t not in STEP_TYPES:
            errors.append(f"{where}: unknown step type {t}")
            continue
        if t == "narrator":
            # a comparison with one audience's home (for: [pt]) needs only that language
            for l in _missing_langs(s.get("text"), [l for l in langs if not s.get("for") or l in s["for"]]):
                errors.append(f"{where}: narrator text lacks {l}")
        elif t == "dialogue":
            if s.get("again"):
                continue
            lines = s.get("lines") or []
            if not DIALOGUE_LINES[0] <= len(lines) <= DIALOGUE_LINES[1]:
                warnings.append(f"{where}: dialogue has {len(lines)} lines (target {DIALOGUE_LINES[0]}–{DIALOGUE_LINES[1]})")
            for ln in lines:
                if ln.get("speaker") not in speakers:
                    errors.append(f"{where}: speaker {ln.get('speaker')} is not in the cast")
                for l in _missing_langs(ln.get("meaning"), langs):
                    errors.append(f"{where}: dialogue line lacks a meaning in {l}")
        elif t == "line":
            if s.get("speaker") not in speakers:
                errors.append(f"{where}: speaker {s.get('speaker')} is not in the cast")
            if s.get("item") not in allowed:
                errors.append(f"{where}: item {s.get('item')} is neither new in this unit nor reviewed")
        elif t == "prompt":
            prompts += 1
            review_prompts += bool(s.get("review"))
            for l in _missing_langs(s.get("ask"), [l for l in langs if not s.get("for") or l in s["for"]]):
                errors.append(f"{where}: prompt lacks {l}")
            ans = s.get("answer") or {}
            if not str(ans.get("text") or "").strip():
                errors.append(f"{where}: prompt has no answer text")
            if ans.get("speaker", "protagonist") not in speakers:
                errors.append(f"{where}: speaker {ans.get('speaker')} is not in the cast")
            for item in s.get("items") or []:
                if item not in allowed:
                    errors.append(f"{where}: item {item} is neither new in this unit nor reviewed")
                prompted[item] = prompted.get(item, 0) + 1
        elif t == "buildup":
            item = s.get("item")
            if item not in allowed:
                errors.append(f"{where}: build-up item {item} is neither new in this unit nor reviewed")
            elif item in new and not _suffix_chain(s.get("parts") or [], new[item]["text"]):
                errors.append(f"{where}: build-up of {item} must grow from the end and finish with the whole item")

    for item in new:
        if item not in prompted:
            errors.append(f"{uid}: new item {item} is never asked for in a prompt")
        elif prompted[item] < 2:
            warnings.append(f"{uid}: new item {item} is asked for only once (aim for 2–3 times, spaced)")
    if not NEW_ITEMS[0] <= len(new) <= NEW_ITEMS[1]:
        warnings.append(f"{uid}: {len(new)} new items (target {NEW_ITEMS[0]}–{NEW_ITEMS[1]})")
    if u["number"] > 1 and prompts:
        share = review_prompts / prompts
        if not REVIEW_SHARE[0] <= share <= REVIEW_SHARE[1]:
            warnings.append(f"{uid}: review is {share:.0%} of the prompts (target about 25%)")
    if not any(s.get("type") == "selfcheck" for s in u["steps"]):
        warnings.append(f"{uid}: no self-check step at the end")
    return errors, warnings


def _used(u):
    used = {i["id"] for i in u["new_items"]} | {r["item"] for r in u.get("reviews") or []}
    for s in u["steps"]:
        used |= set(s.get("items") or [])
        if s.get("item"):
            used.add(s["item"])
    return used


def _norm(text):
    return re.sub(r"[^\w\s]", "", str(text).lower()).split()


def _as_seen_by(u, lang):
    """the unit as one audience gets it: steps and reviews marked for others left out"""
    return {**u, "steps": [s for s in u["steps"] if not s.get("for") or lang in s["for"]],
            "reviews": [r for r in u.get("reviews") or [] if not r.get("for") or lang in r["for"]]}


def check_course(units, b):
    """the course rules, once per audience over the units it sees (Allan, 2026-10-22: some slots have E / A / M
    versions): a version for one audience neither breaks nor satisfies another's schedule"""
    errors = []
    langs = b.get("narrator_languages") or [None]
    for lang in langs:
        seen = [u if lang is None else _as_seen_by(u, lang) for u in units if lang is None or not u.get("tracks") or lang in u["tracks"]]
        for e in _check_sequence(seen):
            if e not in errors:
                errors.append(e)
    return errors


def _check_sequence(units):
    """rules across units: items come back on a doubling schedule (next unit, then within 2, 4, 8…), reviews name
    items met earlier, and no dialogue line of three words or more is copied from an earlier unit"""
    errors = []
    units = sorted(units, key=lambda u: (u["level"], u["number"]))
    order = {u["id"]: k for k, u in enumerate(units)}
    intro, seen_lines = {}, {}
    for k, u in enumerate(units):
        for i in u["new_items"]:
            if i["id"] in intro:
                errors.append(f"{u['id']}: item {i['id']} was already introduced in {units[intro[i['id']]]['id']}")
            else:
                intro[i["id"]] = k
        for r in u.get("reviews") or []:
            if r["item"] not in intro or intro[r["item"]] >= k:
                errors.append(f"{u['id']}: review of {r['item']}, which no earlier unit introduces")
        for s in u["steps"]:
            if s.get("type") != "dialogue" or s.get("again"):
                continue
            for ln in s.get("lines") or []:
                words = _norm(ln.get("text"))
                if len(words) >= 3:
                    key = " ".join(words)
                    if key in seen_lines and seen_lines[key] != k:
                        errors.append(f"{u['id']}: dialogue line repeats {units[seen_lines[key]]['id']}: {ln.get('text')}")
                    seen_lines.setdefault(key, k)
    used = [_used(u) for u in units]
    last = len(units) - 1
    for item, k0 in intro.items():
        prev, gap = k0, 1
        while prev + gap <= last:
            nxt = next((k for k in range(prev + 1, prev + gap + 1) if item in used[k]), None)
            if nxt is None:
                errors.append(f"schedule: {item} (from {units[k0]['id']}) is not back by {units[prev + gap]['id']}")
                break
            prev, gap = nxt, gap * 2
    return errors


def main(folder):
    folder = Path(folder)
    b = yaml.safe_load((folder / "story-bible.yml").read_text(encoding="utf-8"))
    errors, warnings = check_bible(b), []
    units = [yaml.safe_load(p.read_text(encoding="utf-8")) for p in sorted(folder.glob("[ABC][12]-*.yml"))]
    if not errors:
        for u in units:
            e, w = check_unit(u, b)
            errors += e
            warnings += w
        errors += check_course(units, b)
    for w in warnings:
        print("warning:", w)
    for e in errors:
        print("ERROR:", e)
    print(f"{len(units)} units, {len(errors)} errors, {len(warnings)} warnings")
    return 1 if errors else 0


if __name__ == "__main__":
    sys.exit(main(sys.argv[1]))
