# Romanian in Casus

Built 2026-10-21 on the generic case-language builder, next in the order Allan accepted (lt, he, sh, **ro**, sv).

- Five cases as the forms show them: nominative and accusative share one form, genitive and dative another, plus the
  vocative. Wiktionary tags each cell with both cases of its pair; the build gives it both readings, and the reader's
  rules (prepositions, agreement, the verb) narrow them (tools/casus_build/generic.py `_ro_cases`).
- The definite article is an ending (casa, casei, omului), so the case shows where the article is.
- Adjective tables come without case tags: the ending decides (-ului, -ei, -lor → genitive-dative, else
  nominative-accusative).
- Prepositions: most take the accusative (pe, la, în, cu, de, din, pentru…), a few the genitive (împotriva, deasupra,
  înaintea…) or the dative (datorită, conform, grație).
- Keys fold the old cedilla letters ş ţ into the comma letters ș ț (texts mix both).
- Hyphenated contractions (ca-n, mândră-n, s-a, n-am, într-o) are read as their words when the whole is unknown
  (src/lang/ro/tokenize.js).
- Data: English Wiktionary via kaikki (CC BY-SA), 130,512 entries → 99,733 lemmas, 730,660 forms (44.7 MB raw, within
  the 60 MB gate).
- Voice: Piper `ro_RO-mihai-medium` (CC0) as the natural voice; espeak-ng `ro` otherwise.
- Samples: everyday sentences written for Casus (0/59 unknown); Eminescu, *Luceafărul* (1883, public domain), in the
  old ş/ţ spelling (0/35); Wikipedia's *Limba română* (5/140, IPA and a numeral).
- Not yet: definiteness in the badge, the genitive article al/a/ai/ale as its own rule, Learn lessons.
