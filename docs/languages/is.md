# Icelandic in Casus

Built overnight 2026-10-19 on the generic case-language builder (tools/casus_build/generic.py, src/lang/caseLanguage.js).

- Four cases (nefnifall, þolfall, þágufall, eignarfall); prepositions with dative or accusative (í, á, með…) or genitive (til, án, vegna).
- Agreement inside the phrase and the clause, verb number, one subject per clause, the vocative only where someone is addressed.
- Data: English Wiktionary via kaikki (CC BY-SA), streamed and kept for the 50,000 commonest subtitle words (tools/fetch_filtered.py).
- Not yet: proper names (the filter drops them, so Praha, Reykjavík are unknown).
- 2026-10-19: the personal pronouns share one Wiktionary table, so each listed every form; a form that is a pronoun's
  own headword now belongs to that pronoun only (Hún: hún). Icelandic verb tables in the dump carry only the principal
  parts (las, lásu, lesið): present-tense forms (les) are not there, so they stay unknown.
