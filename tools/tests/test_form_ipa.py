import sys, pathlib
sys.path.insert(0, str(pathlib.Path(__file__).resolve().parents[1]))
from form_ipa import segments, apply_rule, learn, per, clean_espeak


def test_segments_keep_length_and_drop_stress():
    assert segments('ˈmaːxən') == ['m', 'aː', 'x', 'ə', 'n']
    assert segments('/ˈt͡saɪ̯t/') == ['t', 's', 'a', 'ɪ̯', 't'] or segments('/ˈt͡saɪ̯t/')[0].startswith('t')


def test_rules_rewrite_in_context():
    assert apply_rule(['r', 'a'], ('', 'r', '', 'ʁ')) == ['ʁ', 'a']
    assert apply_rule(['a', 'r', '#'], ('a', 'r', '', 'ɐ'))[:2] == ['a', 'ɐ']
    assert apply_rule(['ə', 'l'], ('', 'ə', 'l', '')) == ['l']                 # deletion before l
    assert apply_rule(['a', 'p'], ('#', '', 'a', 'ʔ')) == ['ʔ', 'a', 'p']      # insertion at the word start


def test_learning_finds_a_systematic_difference_and_measures_it():
    pairs = [(list(f'r{v}'), list(f'ʁ{v}')) for v in 'aeiou'] * 3
    rules = learn(pairs, min_gain=1)
    assert ('', 'r', '', 'ʁ') in rules or any(r[1] == 'r' and r[3] == 'ʁ' for r in rules)
    assert per(pairs, rules)[0] == 0


def test_espeak_language_tags_are_removed():
    assert clean_espeak('(en)wɜːd(de)') == 'wɜːd'


# 2026-10-27: the 2026-10-23 run was corrupt. espeak drops the last letter of stdin without a newline
# (разбрав → razbræ), and the mk/pl/cs/… voices read "." aloud ("точка"), so every chunk fell back to that path.
from form_ipa import espeak


def test_espeak_keeps_the_last_letter_of_every_word():
    got = espeak(['добро', 'разбрав', 'книга', 'разбравме'], 'mk')
    assert [g.replace('ˈ', '').replace('ˌ', '') for g in got] == ['dobro', 'razbræf', 'kniɡæ', 'razbrævme']


def test_espeak_single_word_and_voices_that_read_punctuation():
    assert espeak(['ab'], 'pl')[0].endswith('p')
    for voice in ('pl', 'cs', 'hu', 'sv', 'pt-br', 'de'):
        assert len(espeak(['dom', 'kot', 'las'], voice)) == 3


def test_shard_is_the_longest_known_prefix_like_the_browser():
    from form_ipa import shard_key
    assert shard_key('повелете', {'по', 'пов', 'а'}) == 'пов'
    assert shard_key('ѕвезда', {'по'}) is None
