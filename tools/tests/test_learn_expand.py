import json
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from learn_expand import expand, word_counts  # noqa: E402


def make_data(tmp: Path) -> Path:
    d = tmp / "xx"
    (d / "paradigms").mkdir(parents=True)
    lemmas = {"1": {"headword": "na", "pos": "prep"}, "2": {"headword": "vo", "pos": "prep"}, "3": {"headword": "i", "pos": "conj"},
              "4": {"headword": "kuka", "pos": "noun"}, "5": {"headword": "ima", "pos": "verb"}, "6": {"headword": "rare", "pos": "prep"},
              "7": {"headword": "toj", "pos": "pron"}}
    (d / "lemmas.json").write_text(json.dumps(lemmas), encoding="utf-8")
    (d / "glosses.en.json").write_text(json.dumps({"1": "on, at", "2": "in", "3": "and", "4": "house", "5": "to have", "6": "seldom", "7": "he"}), encoding="utf-8")
    (d / "phrases.json").write_text(json.dumps([{"p": "kako si", "kind": "phrase", "en": "how are you?"}]), encoding="utf-8")
    para = {"5": [["imam", "v1spia"], ["imaš", "v2spia"], ["ima", "v3spia"]], "7": [["toj", "pnsm"], ["nego", "pasm"]]}
    for k, v in para.items():
        (d / "paradigms" / f"{int(k) % 512}.json").write_text(json.dumps({k: v}), encoding="utf-8")
    return d


def test_word_counts():
    assert word_counts(["Na kuka.", "na Kuka i vo"]) == {"na": 2, "kuka": 2, "i": 1, "vo": 1}


def test_expansion_adds_function_word_verb_and_vocabulary_lessons(tmp_path):
    d = make_data(tmp_path)
    sentences = ["Toj ima kuka na rid."] * 30 + ["Imam vo kuka i nego."] * 30
    index = {"levels": [{"id": "A1", "topics": []}, {"id": "A2", "topics": []}]}
    lessons, questions = {}, {"A1": {}, "A2": {}}
    expand("xx", d, index, lessons, questions, sentences, min_count=10, cases=True)
    by_id = {l["id"]: l for l in lessons.values()}
    na = next(l for l in by_id.values() if l.get("title") == "na")
    assert na["generated"] is True and "on, at" in na["meaning"]["en"]
    # a preposition drills the noun after it in a case language, then the preposition itself
    assert na["match"][0]["seq"][0] == {"word": ["na"]} and na["match"][0]["gap"] == 1
    assert "vo" in na["match"][1]["pool"]
    assert not any(l.get("title") == "rare" for l in by_id.values())          # too rare in the sentences
    ima = next(l for l in by_id.values() if l.get("title") == "ima")
    assert ima["match"] == {"seq": [{"lemma": "^ima$", "pos": "verb"}]}
    toj = next(l for l in by_id.values() if l.get("title") == "toj")
    assert toj["match"] == {"seq": [{"lemma": "^toj$", "pos": "pron"}]}
    vocab = [l for l in by_id.values() if l.get("kind") == "vocab"]
    assert any({"w": "kuka", "en": "house"} in v["words"] for v in vocab)
    assert any({"w": "kako si", "en": "how are you?"} in v["words"] for v in vocab)
    kinds = {t["kind"] for lv in index["levels"] for t in lv["topics"]}
    assert kinds == {"grammar", "vocab"}
    for lv in index["levels"]:
        for t in lv["topics"]:
            for e in t["lessons"]:
                assert e["id"] in lessons and lessons[e["id"]]["level"] == lv["id"]
                if t["kind"] == "grammar":
                    assert e["id"] in questions[lv["id"]]


def test_vowelled_forms_count_against_unvowelled_sentences():
    assert word_counts(["كتب الولد"]) == {"كتب": 1, "الولد": 1}
    assert word_counts(["كَتَبَ"]) == {"كتب": 1}


def test_lemma_patterns_are_valid_javascript():
    from learn_expand import js_escape
    assert js_escape("кто-то") == "кто-то" and js_escape("a.b") == "a\\.b"


def test_reference_levels_get_no_generated_lessons(tmp_path):
    d = make_data(tmp_path)
    index = {"levels": [{"id": "A1", "topics": []}, {"id": "A&G", "topics": [], "reference": True}]}
    lessons, questions = {}, {"A1": {}, "A&G": {}}
    expand("xx", d, index, lessons, questions, ["Toj ima kuka na rid."] * 30, min_count=10)
    assert not index["levels"][1]["topics"]


def test_generated_lessons_speak_german_macedonian_and_arabic_too(tmp_path):
    d = make_data(tmp_path)
    index = {"levels": [{"id": "A1", "topics": []}]}
    lessons, questions = {}, {"A1": {}}
    expand("xx", d, index, lessons, questions, ["Toj ima kuka na rid."] * 30, min_count=10, cases=True)
    na = next(l for l in lessons.values() if l.get("title") == "na")
    assert "Präposition" in na["intro"]["de"] and "предлог" in na["intro"]["mk"] and "حرف جر" in na["intro"]["ar"]
    assert na["topic"]["mk"] == "Предлози"
    assert all({"de", "mk", "ar"} <= set(t["title"]) for t in index["levels"][0]["topics"])
