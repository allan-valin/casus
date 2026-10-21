"""The Conversation build turns each checked course folder into the JSON the Talk tab reads; a course with errors
is not built (a broken unit would reach readers otherwise)."""
import json
import shutil
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from build_conversation import build  # noqa: E402

TEMPLATE = Path(__file__).resolve().parents[1] / "conversation" / "_template"


def test_template_is_checked_but_not_published(tmp_path):
    # Allan, 2026-10-21: the German template units looked like a German course for Portuguese speakers on the site
    src = tmp_path / "conversation"
    shutil.copytree(TEMPLATE, src / "_template")
    out = tmp_path / "talk"
    report = build(src, out)
    assert not (out / "de.json").exists()
    assert report["de"]["errors"] == [] and report["de"]["units"] == 2


def test_a_real_course_replaces_the_example(tmp_path):
    src = tmp_path / "conversation"
    shutil.copytree(TEMPLATE, src / "_template")
    shutil.copytree(TEMPLATE, src / "de")
    out = tmp_path / "talk"
    build(src, out)
    assert json.loads((out / "de.json").read_text(encoding="utf-8"))["example"] is False


def test_a_course_with_errors_is_not_built(tmp_path):
    src = tmp_path / "conversation"
    shutil.copytree(TEMPLATE, src / "de")
    unit = src / "de" / "A1-01.yml"
    unit.write_text(unit.read_text(encoding="utf-8").replace("speaker: becker", "speaker: nobody", 1), encoding="utf-8")
    out = tmp_path / "talk"
    report = build(src, out)
    assert not (out / "de.json").exists()
    assert report["de"]["errors"]


def test_a_bible_without_units_builds_nothing(tmp_path):
    src = tmp_path / "conversation"
    (src / "mk").mkdir(parents=True)
    shutil.copy(TEMPLATE / "story-bible.yml", src / "mk" / "story-bible.yml")
    out = tmp_path / "talk"
    build(src, out)
    assert not out.exists() or not list(out.iterdir())
