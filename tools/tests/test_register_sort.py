import sys, pathlib
sys.path.insert(0, str(pathlib.Path(__file__).resolve().parents[1]))
from register_sort import ja_register, MANUAL


def test_japanese_register_from_the_first_sentence():
    assert ja_register('Concessive ながら is written and formal. More text.')[0] == 'literary'
    assert ja_register('どちら works everywhere: with strangers, in writing.')[0] == 'daily'
    assert ja_register('Neutral in register; what varies is force.')[0] == 'daily'
    assert ja_register('がてら works in speech and writing alike, slightly bookish.')[0] == 'daily'


def test_german_preterite_is_literary_but_not_sein_haben():
    assert MANUAL['de']['de-vsp_01'][0] == 'literary'
    assert 'de-vsp_05' not in MANUAL['de'] or MANUAL['de']['de-vsp_05'][0] == 'daily'
