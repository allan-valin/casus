# German — the grammar Casus marks

Languages design §5. Sources: the Duden *Grammatik* (9th ed.) as the school tradition's reference, its
terms below; *Hammer's German Grammar and Usage* for English labels; the English Wiktionary's German
inflection templates (`de-decl-noun`, `de-conj`, `de-adecl`) and their tags, which are what the data
carries. Source of each mark: **L** lexicon, **A** agreement, **G** government, **S** syntax only.

## 1. Cases (Kasus / Fälle) — primary channel, the hue

| Deutsch | English | Português | badge | source | question (school) |
|---|---|---|---|---|---|
| Nominativ (1. Fall) | nominative | nominativo | Nm | L, A | wer/was? |
| Genitiv (2. Fall) | genitive | genitivo | Gn | L, A, G | wessen? |
| Dativ (3. Fall) | dative | dativo | Dt | L, A, G | wem? |
| Akkusativ (4. Fall) | accusative | acusativo | Ac | L, A, G | wen/was? |

Four cases, the first four validated hues; the order is the school order (1.–4. Fall). Syncretism in nouns
is total for most feminines and heavy elsewhere; the **article** and adjective endings carry the case.

## 2. Gender (Genus) — first-class, shown on every noun

Masculinum / Femininum / Neutrum (masculine/feminine/neuter; masculino/feminino/neutro). Gender decides the
article (der/die/das) and the adjective endings, and it rarely matches the learner's own language
(Allan, 2026-10-18), so a noun pill **always** shows its article — `der`, `die`, `das` — in a small line
above the word, from the lexicon (L). Plural nouns show `die (Pl.)`. Not a toggle: it is the most useful
mark German has for a learner.

## 3. Number (Numerus)

Singular / Plural. Plural: dashed border, paler tint (L, A).

## 4. The article and the determiners (Artikel, Artikelwörter) — the agreement witnesses

der, die, das, des, dem, den; ein, eine, einer, eines, einem, einen; kein-, mein-, dein-, sein-, ihr-,
unser-, euer-, dies-, jen-, jed-, welch-. Each form names a small set of case-number-gender triples; the
noun's own set intersected with its article's settles most noun phrases (A). They are targets and
witnesses (as in Greek).

## 5. Adjective declension (Adjektivdeklination)

| type | after | example | badge |
|---|---|---|---|
| stark (strong) | no article / zero article | guter Wein | st |
| schwach (weak) | der-words | der gute Wein | sw |
| gemischt (mixed) | ein-words | ein guter Wein | gm |

The data tags each adjective form with its type; the badge shows it in the class sub-layer. Degree:
Positiv / Komparativ / Superlativ (L).

## 6. Prepositions (Präpositionen) — government

| governs | prepositions |
|---|---|
| Akkusativ | durch, für, gegen, ohne, um, bis, entlang (postposed) |
| Dativ | aus, bei, mit, nach, seit, von, zu, gegenüber, außer, ab |
| Genitiv | wegen, trotz, während, statt, anstatt, innerhalb, außerhalb, aufgrund, laut (also Dativ) |
| Akkusativ oder Dativ (Wechselpräpositionen) | an, auf, hinter, in, neben, über, unter, vor, zwischen — motion (wohin?) Akk., location (wo?) Dat. |
| contractions | am, im, beim, vom, zum (dem → Dativ); zur (der → Dativ); ans, ins, aufs (das → Akkusativ) |

A preposition governs its **whole noun phrase**, not just the next word: in `in dem großen Haus` the article,
adjective and noun all take the case (G). Wechselpräpositionen stay two-coloured until the phrase settles
them; the motion/location choice is syntax (S).

## 7. The verb (Verb)

| channel | values (Deutsch / English / Português) | badge |
|---|---|---|
| Person | 1., 2., 3. | 1 2 3 |
| Numerus | Singular, Plural | sg pl |
| Tempus (simple forms in the data) | Präsens present presente, Präteritum preterite pretérito | pr pt |
| Modus | Indikativ, Konjunktiv I, Konjunktiv II, Imperativ, Infinitiv, Partizip I/II | ind k1 k2 imp inf ppl |
| Genus verbi | Aktiv (passive is periphrastic: werden + Partizip II, S) | |

Compound tenses (Perfekt, Plusquamperfekt, Futur I/II) and the passive are built with auxiliaries (haben,
sein, werden) and are syntax (S): the blocks show the auxiliary and the participle separately.
**Separable verbs** (anfangen: `fängt … an`) split across the sentence; the particle `an` is shown as a
particle — reuniting it with its verb is syntax (S), for the parser phase.

## 8. Script and spelling

- **Capitals are meaningful**: nouns are capitalised (`das Essen` vs `essen`). Lookup keeps case; a
  sentence-initial word is looked up both as written and with a small first letter.
- **ß and umlauts** are letters, never folded (`Masse` ≠ `Maße`). A text typed without umlauts (`ae`,
  `oe`, `ue`) is not guessed at in v1.
- **Reform spelling** (1996/2006) is what the dictionary carries; `daß` is looked up as `dass`.
- Sentences end at `.` `?` `!`; ordinal numbers (`3. Oktober`) and common abbreviations (z. B., d. h.,
  usw., bzw., Nr., S.) do not end a sentence.

## 9. Not marked in phase 3 (syntax)

Subject vs object beyond what case shows, separable-verb reunion, compound tenses as one unit, the
passive, word order (V2 / verb-final in subordinate clauses), the motion/location sense of
Wechselpräpositionen.
