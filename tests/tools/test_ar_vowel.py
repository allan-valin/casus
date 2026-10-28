"""tools/ar_vowel.py: Wiktionary's vowelling first, the diacritiser for the rest. Run: <venv python> -m unittest tests/tools/test_ar_vowel.py"""
import sys, unicodedata, unittest
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parents[2] / 'tools'))
import ar_vowel


class Vowel(unittest.TestCase):
    def setUp(self):
        self.lex = {'معلمة': 'مُعَلِّمَة', 'بيت': 'بَيْت'}
        self.diac = lambda t: ' '.join('?' + w for w in t.split())   # stands for the diacritiser

    def test_dictionary_word_wins(self):
        self.assertEqual(ar_vowel.vowel('هي معلمة', self.lex, self.diac), unicodedata.normalize('NFC', 'هِيَ مُعَلِّمَة'))

    def test_article_and_clitic(self):
        self.assertEqual(ar_vowel.vowel('البيت وبيت', self.lex, self.diac), 'الْبَيْت وَبَيْت')

    def test_sun_letter_gets_shadda(self):
        self.assertEqual(ar_vowel.vowel('الطالب', {'طالب': 'طَالِب'}, self.diac), unicodedata.normalize('NFC', 'الطَّالِب'))

    def test_punctuation_kept(self):
        self.assertEqual(ar_vowel.vowel('بيت.', self.lex, self.diac), 'بَيْت.')

    def test_punctuation_kept_from_the_diacritiser_word(self):
        self.assertEqual(ar_vowel.vowel('متعب.', {}, lambda t: 'مُتْعَبٍ'), 'مُتْعَب.')

    def test_pronoun_keeps_its_last_vowel(self):
        self.assertEqual(ar_vowel.vowel('هي', {}, self.diac), 'هِيَ')

    def test_case_ending_dropped_tanwin_an_kept(self):
        self.assertEqual(ar_vowel.vowel('بنفسي جدا', {}, lambda t: 'بِنَفْسِيٍّ جِدًّا'), unicodedata.normalize('NFC', 'بِنَفْسِيّ جِدًّا'))

    def test_already_vowelled_left_alone(self):
        self.assertEqual(ar_vowel.vowel('أَنَا', self.lex, self.diac), 'أَنَا')


if __name__ == '__main__':
    unittest.main()
