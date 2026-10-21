# Bengali in Casus

Built 2026-10-21 on the generic case-language builder, after Hindi in the order Allan accepted. On Casus Asia.

- **Cases**: nominative, objective (-কে: whom, to whom), genitive (-এর / -র) and locative (-এ / -তে / -য়), with the
  classifiers -টা / -টি (the one) and the plurals -গুলো / -গুলি, -রা / -এরা, -দের. No grammatical gender.
- **Verbs** go by person and politeness (তুই / তুমি / আপনি), not number (পড়ি, পড়িস, পড়ো, পড়েন).
- Data: the English Wiktionary via kaikki (CC BY-SA) is small for Bengali — 11,227 entries → 10,137 lemmas, 543
  verbs. Its cells carry their romanization in the same string (মানুষটি (manushṭa…)); the build keeps the Bengali word.
  Most nouns come without a table: their endings are generated (tools/casus_build/bn.py), 169,606 forms in all.
  Pronoun tables omit the nominative; it is the headword.
- Voice: espeak-ng `bn`.
- Samples: everyday sentences written for Casus (6/48 unknown); Tagore, *Amar Sonar Bangla* (1905, public domain),
  opening (2/15); Wikipedia's *বাংলা ভাষা* (28/105) — **coverage is limited by the dictionary**: everyday loanwords
  (ব্যাংক, পার্ক) and many verb forms (করছেন, the continuous) are missing.
- Not yet: verb forms from the conjugation classes (the dictionary's 543 verbs are too few), Learn lessons, a larger open
  dictionary source.
