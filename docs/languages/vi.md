# Vietnamese in Casus

Built 2026-10-21 on the generic builder (caseless) and the shared role rules, next in the order Allan accepted
(hi, bn, id, **vi**, fa, sw, tl). On Casus Asia.

- **Words are syllables written apart** (học sinh "student", Việt Nam): the build keeps the dictionary's multi-syllable
  entries (24,851 of 51,896), and the reader joins neighbouring syllables into the longest word it knows, up to four
  (src/lang/vi/stages.js).
- **Roles, not cases**: subject – verb – object from word order; cho + noun the indirect object; pronouns and
  prepositions from a closed table (cho stays with the dictionary: it is also the verb "to give").
- No inflection; tones are part of the letters and kept in the keys.
- Data: English Wiktionary via kaikki (CC BY-SA) → 40,915 lemmas.
- Voice: espeak-ng `vi`.
- Samples: everyday sentences written for Casus (0/50 unknown); Nguyễn Du, *Truyện Kiều* (early 19th c., public
  domain), opening (0/22); Wikipedia's *Tiếng Việt* (0/99).
- Not yet: classifiers (con, cái, quyển…) as their own role, the kinship pronouns (anh, chị, em, ông, bà) as pronouns
  when they address someone, Learn lessons.
