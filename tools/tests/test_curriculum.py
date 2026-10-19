import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from learn_curriculum import curriculum_learn  # noqa: E402

FIX = Path(__file__).parent / "fixtures" / "curriculum" / "xx.yml"


def test_curriculum_lesson_pages_in_both_languages():
    index, lessons, questions = curriculum_learn(FIX)
    assert index["system"] == "CEFR" and index["credit"]["pt"].startswith("Lições")
    topic = index["levels"][0]["topics"][0]
    assert topic["title"] == {"en": "Being", "pt": "Ser e estar"} and topic["kind"] == "grammar"
    assert topic["lessons"][0] == {"id": "a1-sum", "title": "сум", "meaning": {"en": "to be", "pt": "ser/estar"}}
    l = lessons["a1-sum"]
    assert "<code>сум</code>" in l["intro"]["en"] and "<em>ser/estar</em>" in l["intro"]["pt"]
    ids = [s["id"] for s in l["sections"]]
    assert ids == ["formation", "usage", "examples", "mistakes"]
    form = l["sections"][0]
    assert "<th>Pessoa</th>" in form["html"]["pt"] and "<td>сум</td>" in form["html"]["en"] and form["title"]["pt"] == "Formação"
    assert 'class="ja" dir="auto"' in l["sections"][2]["html"]["en"]   # right-to-left scripts show right to left
    assert "❌" in l["sections"][3]["html"]["en"] and "primeira pessoa" in l["sections"][3]["html"]["pt"]
    assert l["examples"][0] == {"text": "Јас сум студент.", "en": "I am a student.", "pt": "Eu sou estudante.", "target": "сум"}
    assert l["match"] == {"seq": [{"word": ["сум", "си"]}]}
    assert l["source"] == "written for Casus"
    qs = questions["A1"]["a1-sum"]["qs"]
    gap = next(q for q in qs if q["type"] == "gap")
    assert gap["answer"] == "сум" and ["＿＿", None] in gap["furi"] and gap["en"] == "I am a student."
    assert any(q["type"] == "translate" and q["answer"] == "I am a student." and q.get("pt") == "Eu sou estudante." for q in qs)


def test_table_cells_can_differ_per_language(tmp_path):
    import yaml
    data = yaml.safe_load(FIX.read_text(encoding="utf-8"))
    data["levels"][0]["topics"][0]["lessons"][0]["table"]["rows"].append(["вие", {"en": "you (polite)", "pt": "o senhor"}])
    f = tmp_path / "xx.yml"
    f.write_text(yaml.safe_dump(data, allow_unicode=True), encoding="utf-8")
    _, lessons, _ = curriculum_learn(f)
    html = lessons["a1-sum"]["sections"][0]["html"]
    assert "<td>o senhor</td>" in html["pt"] and "<td>you (polite)</td>" in html["en"]


def test_graded_vocabulary_from_a_word_list(tmp_path):
    import yaml
    data = yaml.safe_load(FIX.read_text(encoding="utf-8"))
    words = tmp_path / "vocab.tsv"
    words.write_text("\n".join(f"단어{k}\t명사\t초급\tword {k}" for k in range(50)) + "\n", encoding="utf-8")
    data["vocab"] = {"file": str(words), "levels": {"초급": ["A1"]}, "unit": 40, "source": "NIKL"}
    f = tmp_path / "xx.yml"
    f.write_text(yaml.safe_dump(data, allow_unicode=True), encoding="utf-8")
    index, lessons, questions = curriculum_learn(f)
    topics = index["levels"][0]["topics"]
    voc = [t for t in topics if t["kind"] == "vocab"][0]
    assert [len(lessons[e["id"]]["words"]) for e in voc["lessons"]] == [25, 25]       # 50 words → two units, the short tail merged
    first = lessons[voc["lessons"][0]["id"]]
    assert first["kind"] == "vocab" and first["words"][0] == {"w": "단어0", "en": "word 0"} and first["source"] == "NIKL"
