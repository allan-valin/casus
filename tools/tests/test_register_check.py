import sys, pathlib
sys.path.insert(0, str(pathlib.Path(__file__).resolve().parents[1]))
from register_check import style_of, expected_style, unit_findings


def test_style_detectors():
    assert style_of('de', 'Kannst du mir helfen?') == 'informal'
    assert style_of('de', 'Können Sie mir helfen?') == 'formal'
    assert style_of('de', 'Sie ist nett.') is None              # sentence-initial Sie: she / they / you — unknown
    assert style_of('mk', 'Што ви е?') == 'formal'
    assert style_of('mk', 'Како си ти?') == 'informal'
    assert style_of('ja', '日本[にほん]から来[き]ました。') == 'formal'
    assert style_of('ja', 'これ、おいしいよ。') == 'informal'
    assert style_of('ko', '괜찮아요.') == 'formal'
    assert style_of('ko', '괜찮아.') == 'informal'


BIBLE = {'cast': [{'id': 'park', 'register': 'formal'}, {'id': 'minjun', 'register': 'formal'}],
         'formality': {'relationships': [
             {'from': 'minjun', 'to': 'protagonist', 'style': '반말', 'from_unit': 'A1-23'},
             {'from': 'protagonist', 'to': 'minjun', 'style': '반말', 'from_unit': 'A1-23'}]}}


def test_expected_style_follows_the_table_and_its_units():
    assert expected_style(BIBLE, 'protagonist', 'minjun', 'A1-02') == 'formal'
    assert expected_style(BIBLE, 'protagonist', 'minjun', 'A1-23') == 'informal'
    assert expected_style(BIBLE, 'minjun', 'protagonist', 'B1-01') == 'informal'
    assert expected_style(BIBLE, 'park', 'protagonist', 'A1-01') == 'formal'


def test_two_speaker_dialogue_line_in_the_wrong_style_is_found():
    unit = {'id': 'A1-05', 'steps': [{'type': 'dialogue', 'lines': [
        {'speaker': 'protagonist', 'text': '민준 씨, 어디 가?'}, {'speaker': 'minjun', 'text': '집에 가요.'}]}]}
    found = unit_findings('ko', unit, BIBLE)
    assert len(found) == 1 and 'protagonist → minjun' in found[0]
