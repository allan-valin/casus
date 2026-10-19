# Czech in Casus

Built overnight 2026-10-19 on the generic case-language builder (tools/casus_build/generic.py, src/lang/caseLanguage.js).

- Seven cases (numbered 1–7 as Czech schools do), the vocative sharing the nominative hue; prepositions with their cases (v, na: locative or accusative; s: instrumental or genitive…).
- Agreement inside the phrase and the clause, verb number, one subject per clause, the vocative only where someone is addressed.
- Data: English Wiktionary via kaikki (CC BY-SA), streamed and kept for the 50,000 commonest subtitle words (tools/fetch_filtered.py).
- Not yet: proper names (the filter drops them, so Praha, Reykjavík are unknown).
