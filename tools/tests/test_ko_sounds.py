import sys, pathlib
sys.path.insert(0, str(pathlib.Path(__file__).resolve().parents[1]))
from ko_sounds import pronounced


def test_liaison():                      # 연음: a final consonant moves to a following vowel
    assert pronounced('읽어요') == '일거요'
    assert pronounced('맛있어요') == '마시써요'
    assert pronounced('없어요') == '업써요'


def test_nasalisation():                 # 비음화
    assert pronounced('먹는') == '멍는'
    assert pronounced('감사합니다') == '감사함니다'
    assert pronounced('한국말') == '한궁말'


def test_liquidisation():                # 유음화
    assert pronounced('신라') == '실라'
    assert pronounced('설날') == '설랄'


def test_h_and_palatalisation():         # ㅎ 탈락 / 격음화, 구개음화
    assert pronounced('좋아요') == '조아요'
    assert pronounced('좋다') == '조타'
    assert pronounced('같이') == '가치'
    assert pronounced('축하해요') == '추카해요'


def test_tensing_and_words_and_punctuation():   # 경음화 after an obstruent; spaces and marks kept
    assert pronounced('학교') == '학꾜'
    assert pronounced('식당') == '식땅'
    assert pronounced('안녕하세요, 할머니!') == '안녕하세요, 할머니!'


def test_lg_before_g_is_l():               # 읽고 [일꼬]: ㄺ before ㄱ is said ㄹ
    assert pronounced('읽고') == '일꼬'
    assert pronounced('맑게') == '말께'


def test_compare_ipa_turns_espeak_conventions_into_standard_ipa():   # the recogniser hears [ɡ], not espeak's q
    from ko_sounds import compare_ipa
    assert compare_ipa('mˈʌqʌjˌo') == 'mˈʌɡʌjˌo'
    assert compare_ipa('hˈɐqk-jo') == 'hˈakkjo'
    assert compare_ipa('tʃhˈuɫqujˌejo') == 'tʃʰˈulɡujˌejo'
    assert compare_ipa('khˈʌphi') == 'kʰˈʌpʰi'
