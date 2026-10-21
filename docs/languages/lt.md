# Lithuanian in Casus

Built 2026-10-21 on the generic case-language builder (tools/casus_build/generic.py, src/lang/caseLanguage.js), next
in the order Allan accepted (docs/LANGUAGE-PROPOSAL-2026-10-20.md: lt, he, sh, ro, sv).

- Seven cases (vardininkas, kilmininkas, naudininkas, galininkas, įnagininkas, vietininkas, šauksmininkas);
  prepositions with theirs (į + acc, iš/be/nuo/prie/ant + gen, su + ins, po + gen/ins/acc…).
- Agreement inside the phrase and the clause, verb number, one subject per clause, the vocative only where someone is
  addressed.
- Data: English Wiktionary via kaikki (CC BY-SA), 30,195 entries → 14,193 lemmas with a gloss, 189,112 forms.
- **Tone marks**: Wiktionary writes the stress and tone (nãmas, namai̇̃, skaitýti); texts do not. Keys drop the acute,
  grave and tilde (and the dot that keeps an accented i dotted) and keep the letters ą č ę ė į š ų ū ž
  (tools/casus_build/lt.py `strip_lt`, mirrored by src/lang/lt/script.js; the dictionary still shows the marks).
- **Verbs**: the dump has full conjugation tables (53 untagged cells, read by position) for ~700 verbs, and only the
  three principal parts (infinitive, present 3rd, past 3rd) for the other ~10,000. Their finite forms are generated
  from the principal parts — present, past, past frequentative (filed as tense `impf`), future, conditional,
  imperative 2nd/1st person plural — and the generator agrees with Wiktionary's own tables on **99.1 %** of 22,607
  cells (tools/tests/test_lt.py; most of the rest are table slips such as "riss"). Reflexive verbs (-tis) keep only
  the infinitive for now. Negation is written together with the verb: every finite form also has its ne- form
  (nesuprantu, nebuvo; nėra for yra).
- **Nouns**: 4,584 noun entries come without a declension table. The regular declensions (-as, -jas, -ias, -is m/f,
  -ys, -us, -ius, -a, -ia, -ė) are generated from the nominative and gender, with t/d softening (briedžio, minčių);
  measured against the nouns that have tables: **99.1 %** of 38,273 cells. -uo nouns and the irregular ones are left
  out.
- Voice: espeak-ng `lt` (no open Piper voice for Lithuanian).
- Samples: everyday sentences written for Casus; Maironis, *Lietuva brangi* (1920, public domain); Wikipedia's
  *Lietuvių kalba* (CC BY-SA 4.0).
- Unknown words on the samples: everyday sentences 0/56, Maironis 8/58, Wikipedia 41/168 (declined participles
  such as kilusi, mirusiomis; reflexive prefixed verbs such as pasižymi; derived adjectives and adverbs).
- Not yet: Learn lessons (no open course found; AI-written after open grammars, as for Ukrainian), reflexive verb
  forms, verbless clauses ("Mano vardas Jonas" reads mano as the verb "thinks"), the pronoun tables list every person's
  forms under each pronoun (aš also under mes).
