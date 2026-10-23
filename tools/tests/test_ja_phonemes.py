"""Japanese sounds for the natural Piper voice (ja_JP-hi_fi_captain): OpenJTalk phones with pitch accent, in the
voice's own symbols (IPA plus ↑ rise, ↓ fall, # phrase boundary, , pause, . / ? end)."""
import sys, pathlib, pytest
sys.path.insert(0, str(pathlib.Path(__file__).resolve().parents[1]))
pytest.importorskip('pyopenjtalk')
from ja_phonemes import phonemes, ACCENT


def test_symbols_are_ipa_with_accent_marks_and_a_sentence_end():
    ph = phonemes('学生です。', 'がくせいです。')
    assert ph.endswith('.')
    assert set(ph) <= set('aiɯeokɡsɕzdʑttɕnhɸbpmjɾwɴʔʲʷv') | set(ACCENT)
    assert ph.startswith('ɡa')


def test_a_question_ends_with_a_question_mark():
    assert phonemes('学生です か。', 'がくせいです か。').endswith('?')


def test_the_topic_particle_ha_is_wa():
    assert 'wa' in phonemes('私は', 'わたしは')


def test_when_openjtalk_reads_the_kanji_differently_our_reading_wins():
    # 明日 has two readings; ours is あす here — the kana decides what the voice says
    assert phonemes('明日', 'あす').replace('↑', '').replace('↓', '').replace('#', '').rstrip('.') == 'asɯ'


def test_long_and_double_consonants_and_n():
    ph = phonemes('ちょっと', 'ちょっと')
    assert 'ʔ' in ph and ph.startswith('tɕo')
    assert 'ɴ' in phonemes('日本', 'にほん')


def test_ei_in_our_kana_is_the_long_ee_openjtalk_says_so_the_kanji_reading_with_its_accent_is_used():
    assert 'see' in phonemes('学生', 'がくせい')
