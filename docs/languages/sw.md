# Swahili in Casus

Built 2026-10-21 on the generic builder (caseless) and the shared role rules, next in the order Allan accepted
(hi, bn, id, vi, fa, **sw**, tl). On Casus World (East Africa).

- **Roles, not cases**: subject – verb – object from word order; pronouns and prepositions from a closed table.
- **Verbs**: Wiktionary's conjugation tables give subject + tense + stem (ninasoma, wanacheza, alisoma); the object
  prefixes are listed only as bare stems (-nifa), so an unknown word shaped subject + tense + object + stem
  (a-li-ni-pa) is looked up without its object prefix (src/lang/sw/stages.js `withoutObject`).
- Nouns: singular and plural by class (mtoto / watoto, kitabu / vitabu); the class itself is not yet shown.
- Data: English Wiktionary via kaikki (CC BY-SA) → 15,655 lemmas, 107,481 forms.
- Voice: espeak-ng `sw`.
- Samples: everyday sentences written for Casus (1/43 unknown: "es" of Dar es Salaam); Wikipedia's *Kiswahili*
  (9/90: habitual hu- and relative -ye/-yo forms, foreign words).
- Not yet: the habitual hu- and relative forms, noun class as a colour or badge, an old text (Utendi wa Tambuka is
  in Arabic script), Learn lessons.
