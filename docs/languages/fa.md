# Persian in Casus

Built 2026-10-21 on the generic builder (caseless), next in the order Allan accepted (hi, bn, id, vi, **fa**, sw, tl).
On Casus Asia.

- **Roles, not cases, in a verb-last language**: the clause's last word that can be a verb is the verb; را after a noun
  phrase marks the definite direct object, به + noun the indirect object, the first unmarked noun phrase before the
  verb is the subject, and an unmarked one right before the verb the indefinite object (src/lang/fa/stages.js).
- **Script**: Arabic letters right to left; keys drop the short-vowel marks and the zero-width non-joiner (texts write
  می‌روم and میروم), and fold Arabic ي ك into ی ک. Pronoun endings (-ش, -م, -ت, -مان, -تان, -شان) are read apart when
  the whole word is unknown.
- **Forms**: Wiktionary's cells carry romanization and alternatives in one string; the build keeps the first Persian
  form. Plurals -ها / -های, the ezafe / indefinite -ی, and negated verbs (ن-) are generated (81,139 forms in all).
- Data: English Wiktionary via kaikki (CC BY-SA) → 15,413 lemmas.
- Voice: espeak-ng `fa`.
- Samples: everyday sentences written for Casus (0/57 unknown); Hafez (14th c., public domain), the Turk of Shiraz
  (1/18); Wikipedia's *زبان فارسی* (8/117 — compounds and learned words).
- Not yet: the ezafe as its own link (unwritten), compound verbs (زندگی کردن) as one unit, Learn lessons.
