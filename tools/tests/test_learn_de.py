import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from learn_de import parse_page, parse_key  # noqa: E402

FIX = Path(__file__).parent / "fixtures"


def test_a_grimm_grammar_page():
    p = parse_page((FIX / "grimm-cas_02.html").read_text(encoding="utf-8", errors="replace"))
    assert p["en"] == "nominative case" and p["de"] == "Der Nominativ" and p["category"] == "Cases"
    assert "subject of a sentence" in p["html"] and "<audio" not in p["html"] and "<img" not in p["html"] and "onClick" not in p["html"]
    ex = p["examples"][0]
    assert ex["text"] == "Die sieben Zwerge wohnen in der Dachetage." and ex["en"] == "The seven dwarves live in the loft apartment."
    assert ex["target"] == "Die sieben Zwerge"
    assert "Übung" not in p["html"]


def test_the_answer_key():
    sets = parse_key((FIX / "grimm-key-cas_02.html").read_text(encoding="utf-8", errors="replace"))
    mc = sets["cas_02_01_mcr"]
    assert mc["kind"] == "mcr" and "subject" in mc["task"]
    q = mc["items"][0]
    assert q["prompt"].startswith("Die schöne Königin lebte") and q["answer"] == "Die schöne Königin" and "einem Schloss" in q["options"]
    fib = sets["cas_02_02_fib"]
    assert fib["kind"] == "fib" and "das junge Paar" in fib["bank"]
    first = fib["items"][0]
    assert first["answer"] == "Das kleine Mädchen" and first["text"].startswith("＿＿ läuft weg")
