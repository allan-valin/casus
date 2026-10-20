"""Every curriculum written for Casus is well formed (a YAML slip silently splits a sentence or a table cell)."""
import sys
from pathlib import Path

import pytest
import yaml

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from learn_curriculum import _load  # noqa: E402

CURRICULA = sorted(p for p in (Path(__file__).resolve().parents[1] / "curricula").iterdir() if (p.is_dir() and (p / "meta.yml").exists()) or p.suffix == ".yml")


@pytest.mark.parametrize("path", CURRICULA, ids=lambda p: p.name)
def test_curriculum_is_well_formed(path):
    _well_formed(_load(path))


@pytest.mark.parametrize("path", sorted(p for p in CURRICULA[0].parent.iterdir() if (p / "plan.yml").exists()), ids=lambda p: p.name)
def test_written_levels_beside_a_plan_are_well_formed(path):
    plan = yaml.safe_load((path / "plan.yml").read_text(encoding="utf-8"))
    _well_formed({"levels": [yaml.safe_load((path / f"{lv}.yml").read_text(encoding="utf-8")) for lv in plan.get("written", []) if (path / f"{lv}.yml").exists()]})


UI = {"en", "pt", "de", "mk", "ar"}


@pytest.mark.parametrize("path", sorted(p for p in CURRICULA[0].parent.iterdir() if (p / "i18n").is_dir()), ids=lambda p: p.name)
def test_every_translation_overlay_names_real_lessons_and_topics(path):
    """a typo in an overlay would silently leave a lesson in English"""
    meta = yaml.safe_load((path / "meta.yml").read_text(encoding="utf-8")) if (path / "meta.yml").exists() else {"level_files": []}
    plan = yaml.safe_load((path / "plan.yml").read_text(encoding="utf-8")) if (path / "plan.yml").exists() else {}
    files = [path / f"{lv}.yml" for lv in meta.get("level_files", []) + plan.get("written", [])]
    ids, titles = set(), set()
    for f in files:
        if f.exists():
            for t in (yaml.safe_load(f.read_text(encoding="utf-8")) or {}).get("topics") or []:
                titles.add(t["title"]["en"] if isinstance(t["title"], dict) else t["title"])
                ids |= {l["id"] for l in t["lessons"]}
    for f in sorted((path / "i18n").glob("*.yml")):
        over = yaml.safe_load(f.read_text(encoding="utf-8")) or {}
        assert not set(over.get("lessons") or {}) - ids, f"{f.name}: unknown lessons {set(over['lessons']) - ids}"
        assert not set(over.get("topics") or {}) - titles, f"{f.name}: unknown topics {set(over['topics']) - titles}"


def _well_formed(data):
    seen = set()
    for lv in data["levels"]:
        for topic in lv["topics"]:
            assert {"en", "pt"} <= set(topic["title"]) <= UI, topic["title"]
            for l in topic["lessons"]:
                where = f"{lv['id']} {l['id']}"
                assert l["id"] not in seen, where
                seen.add(l["id"])
                assert {"en", "pt"} <= set(l["meaning"]) <= UI and {"en", "pt"} <= set(l["intro"]) <= UI, where
                assert l.get("match"), f"{where}: no rule, so no exercises from Tatoeba"
                for e in l.get("examples", []):
                    assert len(e) in (3, 4) and all(isinstance(x, str) and x for x in e), f"{where}: example {e}"
                    if len(e) == 4:
                        assert e[3].lower() in e[0].lower(), f"{where}: target {e[3]!r} not in {e[0]!r}"
                t = l.get("table")
                if t:
                    for k in ("en", "pt"):
                        width = len(t["head"][k])
                        for row in t["rows"]:
                            assert len(row) == width, f"{where}: row {row} has {len(row)} cells, head {width}"
                for s in l.get("sections", []):
                    assert isinstance(s["body"], str) or {"en", "pt"} <= set(s["body"]) <= UI, where
                for m in l.get("mistakes", []):
                    assert m["wrong"] != m["right"] and {"en", "pt"} <= set(m["why"]) <= UI, where


def test_ai_written_curricula_mark_their_lessons(tmp_path):
    import yaml
    from learn_curriculum import curriculum_learn
    d = tmp_path / "xx"; d.mkdir()
    (d / "meta.yml").write_text(yaml.safe_dump({"system": "CEFR", "level_files": ["A1"], "ai_written": True, "credit": {"en": "c", "pt": "c"}}), encoding="utf-8")
    (d / "A1.yml").write_text(yaml.safe_dump({"id": "A1", "topics": [{"title": {"en": "T", "pt": "T"}, "lessons": [
        {"id": "xx-1", "title": "a", "meaning": {"en": "m", "pt": "m"}, "intro": {"en": "x", "pt": "x"}}]}]}), encoding="utf-8")
    index, lessons, _ = curriculum_learn(d)
    assert lessons["xx-1"]["ai"] is True
    assert index["levels"][0]["topics"][0]["lessons"][0]["ai"] is True


def test_no_word_in_a_rule_or_pool_is_read_as_a_yaml_boolean():
    """on, no, yes, off are words in English, Spanish, French… (YAML 1.1 reads them as booleans unless quoted)"""
    import glob
    import yaml
    flags = {"start", "attested", "ai_written", "notStart", "whole_words", "strict_attested", "noTrail", "unknown"}
    bad = []

    def walk(x, path):
        if isinstance(x, bool) and path.split("/")[-1].split("[")[0] not in flags:
            bad.append(path)
        elif isinstance(x, dict):
            for k, v in x.items():
                walk(v, f"{path}/{k}")
        elif isinstance(x, list):
            for i, v in enumerate(x):
                walk(v, f"{path}[{i}]")
    for f in sorted(glob.glob(str(Path(__file__).resolve().parents[1] / "curricula" / "*" / "*.yml"))):
        walk(yaml.safe_load(open(f, encoding="utf-8")), f)
    assert not bad, bad


CEFR = ["A1", "A2", "B1", "B2", "C1", "C2"]


@pytest.mark.parametrize("path", sorted(p for p in CURRICULA[0].parent.iterdir() if (p / "meta.yml").exists() or (p / "plan.yml").exists()), ids=lambda p: p.name)
def test_every_cefr_course_has_all_six_levels(path):
    """Allan, 2026-10-20: "many don't have all european levels, german miss c1 c2, arabic c2" — a CEFR course runs
    A1 to C2 (German: Grimm's pages in plan.yml, the rest written for Casus beside it)"""
    if (path / "plan.yml").exists():
        plan = yaml.safe_load((path / "plan.yml").read_text(encoding="utf-8"))
        if plan.get("system") != "CEFR":
            return
        have = {lv["id"] for lv in plan["levels"]} | {lv for lv in plan.get("written", []) if (path / f"{lv}.yml").exists()}
    else:
        meta = yaml.safe_load((path / "meta.yml").read_text(encoding="utf-8"))
        if meta.get("system") != "CEFR":
            return
        have = {lv for lv in meta["level_files"] if (path / f"{lv}.yml").exists()}
    assert set(CEFR) <= have, f"{path.name}: missing {sorted(set(CEFR) - have)}"


def test_german_written_levels_join_grimm(tmp_path):
    """German's C1/C2 (no Grimm pages) come from level files written for Casus, marked as AI-written"""
    from learn_curriculum import written_levels
    (tmp_path / "C1.yml").write_text("""id: C1
topics:
- title: {en: Style, pt: Estilo}
  lessons:
  - id: de-c1-x
    title: Nominalstil
    meaning: {en: nominal style, pt: estilo nominal}
    intro: {en: Nouns., pt: Substantivos.}
    examples:
    - [Die Durchführung der Prüfung, The carrying out of the exam, A realização da prova, Durchführung]
    match: {seq: [{pos: noun}]}
""", encoding="utf-8")
    levels, lessons, questions = written_levels(tmp_path, ["C1"])
    assert levels[0]["id"] == "C1" and levels[0]["topics"][0]["lessons"][0]["ai"] is True
    assert lessons["de-c1-x"]["ai"] is True and lessons["de-c1-x"]["level"] == "C1"
    assert questions["C1"]["de-c1-x"]["qs"][0]["type"] == "gap"


def test_an_overlay_adds_another_interface_language(tmp_path):
    """tools/curricula/<code>/i18n/<ui>.yml gives lessons their text in another interface language (Macedonian,
    Arabic; 2026-10-20): meaning, intro, section bodies, mistakes and topic titles; English stays the fallback"""
    import yaml
    from learn_curriculum import curriculum_learn
    d = tmp_path / "xx"; (d / "i18n").mkdir(parents=True)
    (d / "meta.yml").write_text(yaml.safe_dump({"system": "CEFR", "level_files": ["A1"], "credit": {"en": "c", "pt": "c"}}), encoding="utf-8")
    (d / "A1.yml").write_text(yaml.safe_dump({"id": "A1", "topics": [{"title": {"en": "Nouns", "pt": "Substantivos"}, "lessons": [
        {"id": "xx-1", "title": "a", "meaning": {"en": "the article", "pt": "o artigo"}, "intro": {"en": "Use **a**.", "pt": "Use **a**."},
         "sections": [{"id": "usage", "body": {"en": "Often.", "pt": "Sempre."}}],
         "mistakes": [{"wrong": "x", "right": "y", "why": {"en": "because", "pt": "porque"}}]}]}]}), encoding="utf-8")
    (d / "i18n" / "mk.yml").write_text(yaml.safe_dump({"topics": {"Nouns": "Именки"}, "lessons": {"xx-1": {
        "meaning": "членот", "intro": "Користи **a**.", "sections": {"usage": "Често."}, "mistakes": ["зашто"]}}}, allow_unicode=True), encoding="utf-8")
    index, lessons, _ = curriculum_learn(d)
    l = lessons["xx-1"]
    assert l["meaning"]["mk"] == "членот" and "<strong>a</strong>" in l["intro"]["mk"]
    assert l["sections"][0]["html"]["mk"] == "<p>Често.</p>" and "зашто" in l["sections"][-1]["html"]["mk"]
    assert l["topic"]["mk"] == "Именки" and index["levels"][0]["topics"][0]["title"]["mk"] == "Именки"
    assert "mk" not in l["sections"][0]["title"] or l["sections"][0]["title"]["mk"]
    assert l["meaning"]["en"] == "the article"
