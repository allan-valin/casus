# French in Casus

Added 2026-10-20 on the generic builder, caseless, on the Romance role rules shared with Portuguese (src/lang/romance.js).

- No cases: the colours are the roles — subject (Suj), direct object (OD), indirect object (OI) — from word order and
  the marked words (src/lang/fr/stages.js): le / la / les / l' before a verb are object pronouns, before a noun
  articles; lui / leur are indirect objects; à / au / aux + noun phrase after the verb is the indirect object.
- Elided words are their own tokens (l'homme → l + homme; j'ai → j + ai; qu'il → qu + il) and are read from the
  Casus closed-class table (l, j, d, qu, n, m, t, s, c, jusqu, lorsqu, puisqu).
- Data: English Wiktionary via kaikki (CC BY-SA), kept for the 50,000 commonest French subtitle words (FrequencyWords,
  CC BY-SA 4.0): 50,316 of 403,269 entries.
- Drills: verb endings (parler, finir, vendre, être, avoir, aller, faire), frequent words, phrases.
- Voice: eSpeak NG fr-fr; Piper fr_FR-siwis-medium.
- Not yet: inversion in questions (Parlez-vous ?), the negation ne … pas as one unit, aujourd'hui (split at the
  apostrophe).
