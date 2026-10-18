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

## 10. Grouping rules (Allan, 2026-10-18: "figure out more grammar rules for groupings")

The rules a German reader applies without thinking, written so the engine can apply them. Status:
**done** (in the engine, tested), **next** (planned, cheap with the current data), **parser** (needs the
syntax model of design §8).

### Noun phrases (Nominalphrase)

| id | rule | status |
|---|---|---|
| NP1 | A phrase is (article word) (adjectives, participles, numerals)* noun, contiguous, no punctuation inside; every member takes the noun's case, number and gender (*in seinem Bett* → dat sg n throughout). | done |
| NP2 | The article word decides the adjective declension: der-words (der, dieser, jener, jeder, welcher, mancher, solcher, alle) → weak; ein-words (ein, kein, mein, dein, sein, ihr, unser, euer) → mixed; none → strong. | done |
| NP2a | A contraction carries its article (*im* = *in dem*, *zur* = *zu der*): the adjective after it is weak (*im großen Garten*). | done |
| NP3 | Before its noun an article word is an article word, not a pronoun (*seinem Bett*: not *seiner*). | done |
| NP4 | A word directly followed by the phrase it governs is the preposition (*in*, *zu* lose their adverb/adjective readings). | done |
| NP5 | A preposition governs its whole phrase; a personal pronoun is a whole phrase (*mit ihm*). | done |
| NP6 | A genitive phrase right after a noun phrase belongs to it (*das Haus **des Vaters***): glue it to the preceding phrase. | next |
| NP7 | An adjective without a noun after its article is a noun (*der Alte*, *das Gute*): nominalised, keeps adjective endings. | next |
| NP8 | Appositions between commas repeat the case of the phrase they explain (*Gregor, **der Reisende**,*). | next |
| NP9 | Coordinated phrases (*mit dem Vater und der Mutter*) share the preposition and the case. | next |
| NP10 | Postposed prepositions and circumpositions: *entlang* after its object (acc), *um … willen* (gen), *von … an*. | next |

### Clauses (Satz, Hauptsatz, Nebensatz)

| id | rule | status |
|---|---|---|
| CL1 | Commas, semicolons, colons, dashes and brackets end a clause or an insertion; words do not agree across them. | done |
| CL2 | A finite verb in the 1st/2nd person needs *ich, wir, du, ihr* as subject in its clause (German drops no subject pronoun); otherwise it is 3rd person. An imperative stands first in its clause. | done |
| CL3 | A clause has one finite verb; once it is certain, the clause-final infinitive or participle is the right bracket of the **Satzklammer** (*fand … verwandelt*, *hat … gegessen*, *will … spielen*). | done |
| CL4 | **Nebensatz**: after a subordinating conjunction (als, dass, weil, wenn, ob, obwohl, damit, nachdem, bevor, während, da, falls, sodass, seit, bis, indem) or a relative pronoun after a comma (der/die/das, welcher), the finite verb is the **last** word of the clause; its other readings drop, and the verbs before it are not finite. | done |
| CL4a | A subordinating conjunction opening its clause is the conjunction (*Als* is not a noun there). | done |
| CL5a | A clause with a certain nominative subject, or the sentence's first clause, needs a finite verb: when only one word in it can be a verb, it is finite (*Die Kinder spielen*). | done |
| CL5 | **Hauptsatz**: the finite verb is the 2nd constituent (**V2**); in a question or command, the 1st (**V1**). | next (needs constituent boundaries = NP1) |
| CL6 | **Separable verbs**: a particle at the end of a main clause (an, auf, aus, ab, ein, mit, vor, zu, zurück, weg, los, nach, her, hin, …) belongs to the clause's finite verb (*fängt … an* = *anfangen*); the pair is looked up as one word. | next |
| CL7 | The finite verb agrees in number with the nominative subject (*die Kinder **spielen***): one certain nominative subject and no *und/oder* → its number. | done |
| CL8 | *zu* + infinitive at the clause end is an infinitive group (*um … zu*, *ohne … zu*, *statt … zu*); *zu* there is not a preposition. | done |
| CL9 | Compound tenses and the passive: *haben/sein* + Partizip II = Perfekt; *werden* + Infinitiv = Futur; *werden* + Partizip II = Passiv. Mark the pair. | next |
| CL10 | Verb valency: which case a verb takes for its objects (*helfen* + dat, *gedenken* + gen, *geben* + dat + acc) settles the remaining nominal cases. Needs a valency list per verb. | parser (or a valency list) |

### Added from the German-teacher review (2026-10-18, 98 sentences)

| id | rule | status |
|---|---|---|
| NP0 | A capitalised first word whose small-letter form is a pronoun, adverb, conjunction or preposition is not a noun (*Ich*, not *das Ich*). | done |
| NP1a | A noun of unknown gender matches any gender; a phrase whose members disagree with its noun is not narrowed at all (nothing lost). | done |
| NP3a | dies-, jen-, kein-, welch-, all- are article words; numerals and uninflected words are carried through a phrase. | done |
| NP12 | A cardinal above one makes the phrase plural. | done |
| NP13a | A capitalised adjective in a name (*der Deutschen Einheit*, *das Rote Kreuz*) is read as an adjective of the following noun. | done |
| CL2b | An unambiguous *ich/du/wir* fixes the finite verb's person and number. | done |
| CL2c | *sie/Sie/ihr* as the only possible subject takes the verb's person and number. | done |
| CL6a | A clause-final word with nothing after it to govern is not a preposition (*ruft … an*), postpositions excepted. | done |
| D1 | One nominative per clause: once the subject is certain the other phrases are not nominative (copula predicates excepted). | done |
| REL1 | A relative pronoun takes gender and number from its antecedent; an article word followed by something that cannot continue a noun phrase is the pronoun. | done |
| CL8a | No nominative in a zu-infinitive clause; *um/ohne/statt … zu* open with the conjunction. | next |
| NP11 | A nominalised infinitive after an article or contraction is a neuter singular noun (*das Wünschen, beim Essen*). | next |
| NP13 | Saxon genitive (*Peters Buch*); proper names take case from article or preposition. | next |
| NP14 | *dessen/deren* + noun: the noun is not genitive. | next |
| CL11 | Copula predicate is nominative; *als/wie* in comparisons take the case of what they compare. | next |
| CMP | **Compounds** (Allan): a compound noun is split into its dictionary roots (with linking -s-, -es-, -n-, -en-, -er-) and each root is drawn in its own ink inside the block. | next |

### Order of the cascade (German)

government (NP4, NP5) → noun phrases (NP1–NP3, NP12) → government again → noun phrases again → clauses (CL1–CL8, D1, REL1) → noun phrases again → clauses again → government.
Each stage only narrows and never empties a word; what stays open is shown open.
