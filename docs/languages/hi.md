# Hindi in Casus

Built 2026-10-21 on the generic case-language builder, first of the languages after lt, he, sh, ro, sv in the order
Allan accepted (hi, bn, id, vi, fa, sw, tl). On Casus Asia.

- **Cases**: nouns and adjectives have a direct, an oblique and a vocative form; pronouns also an ergative (मैंने,
  उसने), a dative (मुझे, उसे) and a genitive (मेरा, उसका). Postpositions follow the noun, which then stands in the
  oblique (लड़का → लड़के ने, किताबें → किताबों में): a word right before ने को से में पर तक का की के keeps its
  oblique readings (src/lang/hi/stages.js); the postpositions themselves come from a closed table (के has no
  dictionary entry of its own).
- Devanagari words keep their vowel signs, nukta and chandrabindu; sentences end at the danda (।). Keys are NFC.
- Data: English Wiktionary via kaikki (CC BY-SA), 39,220 entries → 23,853 lemmas, 75,410 forms. Verb tenses are
  mostly periphrastic (पढ़ता है, पढ़ रहा है): the single-word forms are in the dictionary (participles, future,
  subjunctive, imperative), the auxiliaries are read as words of their own.
- Voice: espeak-ng `hi` (no open Piper voice).
- Samples: everyday sentences written for Casus (1/65 unknown, a name); Premchand, *Idgah* (1933; the author died in
  1936, public domain), opening (0/16); Wikipedia's *हिन्दी* (3/145).
- Drills: no subtitle frequency list exists for Hindi (FrequencyWords has none), so the frequent-word and phrase
  drills are empty; the form drills work.
- Not yet: compound postpositions (के लिए, के साथ) as one unit, transliteration under the words, the ergative rule
  (ने with perfective transitive verbs, the verb agreeing with the object), Learn lessons.
