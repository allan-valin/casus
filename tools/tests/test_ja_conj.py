"""Japanese conjugation for the dictionary index (overnight plan 2026-10-19): the everyday forms Wiktionary's
tables leave out (ました, ません, なかった…), generated from the verb or adjective class."""
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from casus_build.ja.conj import conjugate  # noqa: E402


def forms(word, cls):
    return conjugate(word, cls)


def test_ichidan():
    f = forms("食べる", "ichidan")
    assert f["neg"] == ["食べない"] and f["past"] == ["食べた"] and f["te"] == ["食べて"]
    assert f["polite"] == ["食べます"] and f["politepast"] == ["食べました"] and f["politeneg"] == ["食べません"]
    assert f["politepastneg"] == ["食べませんでした"] and f["pastneg"] == ["食べなかった"] and f["vol"] == ["食べよう"]
    assert f["cond"] == ["食べれば"] and f["tara"] == ["食べたら"] and f["pot"] == ["食べられる"] and f["des"] == ["食べたい"]


def test_godan_endings_and_sound_changes():
    assert forms("書く", "godan")["te"] == ["書いて"] and forms("書く", "godan")["past"] == ["書いた"]
    assert forms("泳ぐ", "godan")["te"] == ["泳いで"]
    assert forms("話す", "godan")["past"] == ["話した"] and forms("話す", "godan")["polite"] == ["話します"]
    assert forms("待つ", "godan")["te"] == ["待って"] and forms("待つ", "godan")["neg"] == ["待たない"]
    assert forms("死ぬ", "godan")["past"] == ["死んだ"] and forms("遊ぶ", "godan")["te"] == ["遊んで"] and forms("読む", "godan")["past"] == ["読んだ"]
    assert forms("帰る", "godan")["te"] == ["帰って"] and forms("買う", "godan")["neg"] == ["買わない"] and forms("買う", "godan")["past"] == ["買った"]
    assert forms("書く", "godan")["vol"] == ["書こう"] and forms("書く", "godan")["pot"] == ["書ける"] and forms("書く", "godan")["cond"] == ["書けば"]


def test_iku_and_the_irregulars():
    assert forms("行く", "godan-iku")["te"] == ["行って"] and forms("行く", "godan-iku")["past"] == ["行った"]
    s = forms("する", "suru")
    assert s["neg"] == ["しない"] and s["politepast"] == ["しました"] and s["te"] == ["して"] and s["pot"] == ["できる"]
    assert forms("勉強する", "suru")["politepast"] == ["勉強しました"]
    k = forms("くる", "kuru")
    assert k["neg"] == ["こない"] and k["polite"] == ["きます"] and k["te"] == ["きて"]
    assert forms("来る", "kuru")["neg"] == ["来ない"] and forms("来る", "kuru")["te"] == ["来て"]


def test_adjectives():
    a = forms("高い", "i")
    assert a["neg"] == ["高くない"] and a["past"] == ["高かった"] and a["pastneg"] == ["高くなかった"] and a["te"] == ["高くて"] and a["adv"] == ["高く"]
    assert forms("いい", "i")["past"] == ["よかった"] and forms("いい", "i")["neg"] == ["よくない"]
    n = forms("綺麗", "na")
    assert n["attr"] == ["綺麗な"] and n["adv"] == ["綺麗に"] and n["past"] == ["綺麗だった"] and n["neg"] == ["綺麗じゃない", "綺麗ではない"]
