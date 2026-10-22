import sys, pathlib, pytest
sys.path.insert(0, str(pathlib.Path(__file__).resolve().parents[1]))
from ja_text import parse, convert_narration


def test_words_readings_and_kana_for_the_voice():
    r = parse('私[わたし] は 学生[がくせい] です。')
    assert r['text'] == '私は学生です。'
    assert r['rt'] == [['私', 'わたし'], ['は', 'は'], ['学生', 'がくせい'], ['です', 'です'], ['。', '。']]
    assert r['say'] == 'わたしはがくせいです。'


def test_kanji_with_kana_after_it_in_one_word():
    r = parse('食[た]べます')
    assert r['text'] == '食べます'
    assert r['rt'] == [['食べます', 'たべます']]


def test_katakana_and_punctuation_need_no_reading():
    assert parse('コーヒー を ください！')['text'] == 'コーヒーをください！'


def test_a_kanji_without_its_reading_is_an_error():
    with pytest.raises(ValueError):
        parse('学生 です')


def test_taught_words_in_narration_lose_their_markup_and_keep_their_reading():
    text, found = convert_narration('Diga «学生[がくせい]» — estudante.')
    assert text == 'Diga «学生» — estudante.'
    assert found['学生']['say'] == 'がくせい'


def test_a_whole_course_gets_plain_text_and_a_readings_table():
    from ja_text import rich_course
    item = {'id': 'gakusei', 'text': '学生[がくせい]', 'meaning': {'pt': 'estudante'}}
    data = {'items': [item], 'units': [{'new_items': [item], 'steps': [
        {'type': 'narrator', 'text': {'pt': 'Diga «学生[がくせい]».'}},
        {'type': 'dialogue', 'lines': [{'speaker': 'kenta', 'text': '私[わたし] は 学生[がくせい] です。'}]},
        {'type': 'prompt', 'ask': {'pt': '?'}, 'answer': {'speaker': 'protagonist', 'text': '学生[がくせい] です。'}, 'items': ['gakusei']},
        {'type': 'buildup', 'item': 'gakusei', 'parts': ['せい', '学生[がくせい]']}]}]}
    out = rich_course(data)
    u = out['units'][0]
    assert out['items'][0]['text'] == '学生'
    assert u['steps'][0]['text']['pt'] == 'Diga «学生».'
    assert u['steps'][1]['lines'][0]['text'] == '私は学生です。'
    assert u['steps'][2]['answer']['text'] == '学生です。'
    assert u['steps'][3]['parts'] == ['せい', '学生']
    assert out['readings']['私は学生です。']['say'] == 'わたしはがくせいです。'
    assert out['readings']['学生']['rt'] == [['学生', 'がくせい']]
