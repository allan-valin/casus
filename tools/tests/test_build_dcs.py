import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from build_dcs import iast_to_deva, sentences_of  # noqa: E402


def test_iast_to_devanagari():
    assert iast_to_deva("rāmaḥ") == "रामः"
    assert iast_to_deva("vanam") == "वनम्"
    assert iast_to_deva("gacchati") == "गच्छति"
    assert iast_to_deva("kṛṣṇa") == "कृष्ण"
    assert iast_to_deva("aiśvarya") == "ऐश्वर्य"
    assert iast_to_deva("jñānam") == "ज्ञानम्"
    assert iast_to_deva("saṃskṛtam") == "संस्कृतम्"
    assert iast_to_deva("iva") == "इव"
    assert iast_to_deva("ṛṣiḥ") == "ऋषिः"


CONLLU = """# text = siddhiḥ sādhye satām astu
# sent_id = 1
1\tsiddhiḥ\tsiddhi\tNOUN\t_\tCase=Nom\t_\t_\t_\tUnsandhied=siddhiḥ
2\tsādhye\tsādhya\tNOUN\t_\tCase=Loc\t_\t_\t_\tUnsandhied=sādhye
3\tsatām\tas\tVERB\t_\tCase=Gen\t_\t_\t_\tUnsandhied=satām
4\tastu\tas\tVERB\t_\tMood=Imp\t_\t_\t_\tUnsandhied=astu

# text = jāhnavīphenalekheva
# sent_id = 2
1-4\tjāhnavīphenalekheva\t_\t_\t_\t_\t_\t_\t_\t_
1\tjāhnavī\tjāhnavī\tNOUN\t_\tCase=Cpd\t_\t_\t_\tUnsandhied=jāhnavī
2\tphena\tphena\tNOUN\t_\tCase=Cpd\t_\t_\t_\tUnsandhied=phena
3\tlekhā\tlekhā\tNOUN\t_\tCase=Nom\t_\t_\t_\tUnsandhied=lekhā
4\tiva\tiva\tPART\t_\t\t_\t_\t_\tUnsandhied=iva
"""


def test_sentences_from_the_padapatha_with_compounds_rejoined():
    out = sentences_of(CONLLU)
    assert out == ["सिद्धिः साध्ये सताम् अस्तु ।", "जाह्नवीफेनलेखा इव ।"]


def test_sentences_without_compounds_on_request():
    assert sentences_of(CONLLU, compounds=False) == ["सिद्धिः साध्ये सताम् अस्तु ।"]
