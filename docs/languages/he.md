# Hebrew in Casus

Built 2026-10-21 on the generic builder (tools/casus_build/generic.py, caseless like Dutch) and the shared role rules
(src/lang/romance.js), next in the order Allan accepted (docs/LANGUAGE-PROPOSAL-2026-10-20.md: lt, he, sh, ro, sv).
On Casus World (no cases).

- **Roles, not cases**: subject (noun phrase before the verb), direct object (first after it, or after **את**, the
  marker of the definite object, wherever it stands), indirect object (**ל / אל** + noun). Pronoun forms (**לי, לו,
  אותו, שלי…**) come from a closed-class table (src/lang/he/stages.js).
- **Prefixes**: ו "and", ש / כש "that, when", ב כ ל מ "in, as, to, from", ה "the" are written onto the next word. A
  word the dictionary lacks is split when what follows the prefixes is known, longest prefix first (ובבית: ו + ב +
  בית); the article absorbed after ב/כ/ל is not restored (src/lang/he/tokenize.js).
- **Vowel points**: keys drop the points and cantillation; the maqaf separates words. Texts are written in full
  spelling (ktiv male), so every pointed dictionary form also gets its full spelling after the Academy's rules —
  holam and qubuts → ו, hiriq → י unless the syllable is closed, consonantal vav inside the word doubled
  (יִכְתֹּב → יכתוב, דִּבֵּר → דיבר, מִצְוָה → מצווה; tools/casus_build/he.py, tools/tests/test_he.py).
- **Verbs**: the present is a participle by gender and number, any person (אני / הוא לומד, את לומדת); past and future
  by person, number and gender.
- Data: English Wiktionary via kaikki (CC BY-SA), 18,075 entries → 14,615 lemmas.
- Voice: espeak-ng `he` (no open Piper voice for Hebrew).
- Samples: everyday sentences written for Casus (0/56 unknown); Bialik, *El ha-tsipor* (1891, public domain), pointed
  (1/44 unknown); Genesis 1:1–5, unpointed (0/63).
- Not yet: Learn lessons, binyan labels in the badge, the definite article inside ב/כ/ל (בבית shows no "the"),
  pronoun suffixes on nouns and prepositions beyond the table (ספרי "my book" is read from Wiktionary's possessed
  forms when listed), Biblical vav-consecutive marked as such.
