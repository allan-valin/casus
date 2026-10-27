import sys, pathlib
sys.path.insert(0, str(pathlib.Path(__file__).resolve().parents[1]))
from ipa_coverage import unit_words, covered


def test_unit_words_take_target_text_only():
    unit = {'new_items': [{'text': 'Добар ден', 'meaning': {'en': 'Good day'}}],
            'steps': [{'type': 'narrator', 'text': {'en': "Say 'Добар ден'."}},
                      {'type': 'dialogue', 'lines': [{'text': 'Не те разбрав добро.', 'meaning': {'en': 'x'}}]},
                      {'type': 'prompt', 'answer': {'text': 'Да!'}}, {'type': 'buildup', 'parts': ['-бро', 'добро']}]}
    assert unit_words(unit) == {'добар', 'ден', 'не', 'те', 'разбрав', 'добро', 'да', 'бро'}


def test_covered_by_headword_or_form():
    assert covered('Добро', {'добро'}, {}) == 'exact'
    assert covered('разбрав', set(), {'разбрав': 'razbraf'}) == 'form'
    assert covered('Стојановска', set(), {}) is None


def test_japanese_markup_and_greedy_cut():
    from ipa_coverage import greedy
    assert unit_words({'text': 'お願[ねが]いします'}) == {'お願いします'}
    assert greedy('日本です', {'日本', 'です'}) == ['日本', 'です']
    assert greedy('日本ぴょ', {'日本'}) == ['日本', 'ぴょ']
