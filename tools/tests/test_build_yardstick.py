import sys, pathlib
sys.path.insert(0, str(pathlib.Path(__file__).resolve().parents[1]))
from build_yardstick import level_of_rank, merge, nikl_word


def test_rank_bands_grow_with_the_level():
    assert level_of_rank(1) == 'A1' and level_of_rank(1000) == 'A1'
    assert level_of_rank(1001) == 'A2' and level_of_rank(4000) == 'B2' and level_of_rank(9000) == 'C2'
    assert level_of_rank(50000) is None


def test_the_lowest_level_wins():
    m = {}
    merge(m, 'Haus', 'B1'); merge(m, 'haus', 'A1'); merge(m, 'Haus', 'A2')
    assert m == {'haus': 'A1'}


def test_nikl_homograph_numbers_go():
    assert nikl_word('가격02') == '가격' and nikl_word('가다') == '가다'
