# Ancient Greek — the grammar Casus marks

Languages design §5: before the inventory is written, the language's own grammatical tradition, in its own
terms, with what a reader marks on a page and where each mark comes from. Sources: H. W. Smyth, *Greek
Grammar* (1920, rev. Messing 1956), §§ cited; W. W. Goodwin, *A Greek Grammar* (1900); the English
Wiktionary's Ancient Greek inflection templates (`grc-decl`, `grc-conj`) and their tags, which are what the
data carries.

Source of each mark: **L** = the lexicon (the form says it); **A** = agreement (another word settles it);
**G** = government (a preposition or verb settles it); **S** = syntax only (not in phase 2).

## 1. Cases (πτώσεις) — the primary channel, on the hue

| Greek | English | Português | badge | source | notes |
|---|---|---|---|---|---|
| ὀνομαστική | nominative | nominativo | Nm | L, A | subject, predicate noun (Smyth 938) |
| γενική | genitive | genitivo | Gn | L, A, G | also the Latin ablative of separation (Smyth 1289) |
| δοτική | dative | dativo | Dt | L, A, G | also instrumental and locative uses (Smyth 1450) |
| αἰτιατική | accusative | acusativo | Ac | L, A, G | direct object, extent, after εἰς (Smyth 1551) |
| κλητική | vocative | vocativo | Vc | L | address, often with ὦ (Smyth 1283) |

Five cases, so the six validated hues cover them with one left unused; no case shares a hue.
Syncretism is heavy (nominative = vocative in most plurals and many singulars; neuter nominative =
accusative), so many blocks stay ambiguous until the article or a preposition settles them.

## 2. Number (ἀριθμός) and gender (γένος) — secondary channels

| Greek | English | Português | marking | source |
|---|---|---|---|---|
| ἑνικός | singular | singular | solid border, stronger tint | L |
| δυϊκός | dual | dual | **double border** (Smyth 195) | L |
| πληθυντικός | plural | plural | dashed border, paler tint | L |
| ἀρσενικόν / θηλυκόν / οὐδέτερον | masculine / feminine / neuter | masculino / feminino / neutro | class sub-layer badge m/f/n | L |

## 3. The article (ἄρθρον) — the agreement witness

ὁ ἡ τό agrees with its noun in case, number and gender (Smyth 1118) and is almost never ambiguous in
all three at once, so it is the strongest agreement witness Greek has: `τοῦ λόγου` settles λόγου as
genitive singular even when the noun alone could not. In the inventory the determiner (`det`) and the
pronoun are witnesses; adjectives, participles and the article itself are targets.

## 4. Prepositions (προθέσεις) — government

| governs | prepositions |
|---|---|
| genitive | ἀντί, ἀπό, ἐκ / ἐξ, πρό |
| dative | ἐν, σύν (ξύν) |
| accusative | ἀνά, εἰς (ἐς) |
| genitive or accusative | διά, κατά, μετά, ὑπέρ |
| genitive, dative or accusative | ἀμφί, ἐπί, παρά, περί, πρός, ὑπό |

(Smyth 1681–1702.) A preposition is tinted with the case it governs; when its object settles the case
(`ἐν ἀρχῇ` → dative), both narrow, as Latin's `in Galliam` does. Elided forms (ἀπ’, ἐπ’, καθ’, μεθ’,
παρ’, ὑπ’, δι’, ἀφ’, ἐφ’, ὑφ’) look up through the elision table (§7).

## 5. The verb (ῥῆμα) — badge person·number tense

| channel | values (Greek / English / Português) | badge |
|---|---|---|
| person | πρῶτον, δεύτερον, τρίτον πρόσωπον / 1st, 2nd, 3rd / 1ª, 2ª, 3ª | 1 2 3 |
| number | singular, dual, plural | sg du pl |
| tense (χρόνος) | ἐνεστώς present, παρατατικός imperfect, μέλλων future, ἀόριστος aorist, παρακείμενος perfect, ὑπερσυντέλικος pluperfect, συντελεσμένος μέλλων future perfect | pr im fu ao pf pl fp |
| mood (ἔγκλισις) | ὁριστική indicative, ὑποτακτική subjunctive, εὐκτική optative, προστακτική imperative, ἀπαρέμφατος infinitive, μετοχή participle | ind sub opt imp inf ppl |
| voice (διάθεσις) | ἐνεργητική active, μέση middle, παθητική passive (+ mediopassive where the form cannot tell) | act mid pass mp |

Source L. A participle is nominal for colouring (it has case, number, gender) and carries tense and
voice in its reading line, as Latin's does.

## 6. Periods — the dictionary period control and the IPA variant

| id | label | example authors | Wiktionary IPA tag |
|---|---|---|---|
| homeric | Homeric & Archaic (8th–6th c. BC) | Homer, Hesiod, the lyric poets | 5th BCE Attic (closest available) |
| classical | Classical Attic (5th–4th c. BC) | Plato, Thucydides, the tragedians, Xenophon | 5th BCE Attic |
| koine | Koine (3rd c. BC – 4th c. AD) | the Septuagint, the New Testament, Polybius, Plutarch | 1st CE Egyptian / 4th CE Koine |
| byzantine | Byzantine (5th–15th c.) | the Church Fathers, Psellos, Anna Komnene | 10th CE Byzantine |
| modern | Learned and modern reading | — | 15th CE Constantinopolitan |

Wiktionary carries no attestation period per lemma for Ancient Greek, so the period control in phase 2
chooses the **pronunciation** shown, not the dimming of entries (Latin's age codes have no Greek
equivalent in the data). Recorded as a limitation, not hidden.

## 7. Script, punctuation, elision, crasis, enclitics

- **Diacritics distinguish words**: breathings (ἡ / ἥ / ἤ / ἦ), accents (ποτέ / πότε), iota subscript
  (τῇ / τη). Lookup keeps them; it folds only case, final sigma and length marks (macron, breve).
  Input typed **without** diacritics is looked up through a second, stripped key, and the block shows
  the dictionary's marked form in a reading line (languages design §7, Allan 2026-10-18).
- **Punctuation**: `.` full stop, `;` question mark, `·` (ano teleia) a colon or semicolon — it does
  **not** end a sentence. `,` comma.
- **Elision** (Smyth 70): a final short vowel drops before a vowel, marked with `’` (ἀλλ’, δ’, τ’, ἐπ’,
  ἀπ’, κατ’, μετ’, παρ’, ὑπ’, οὐδ’). Looked up as written and through an elision table of the common
  ones.
- **Crasis** (Smyth 62): κἀγώ (καὶ ἐγώ), τοὔνομα (τὸ ὄνομα) — left whole; Wiktionary lists the common
  crasis forms as entries.
- **Enclitics** (Smyth 181): τε, γε, με, μου, μοι, σε, σου, σοι, τις, τι, που, ποτε, πω, πως, εἰμί and
  φημί in the present indicative — written as separate words in modern editions, so no splitting.

## 8. What phase 2 does not mark (needs syntax)

Article-noun pairing beyond agreement, the genitive absolute, the articular infinitive, μέν … δέ
correlation, verbal aspect beyond the tense label. These are §8 (parser phase) material.

## Transliteration under each word (Allan, 2026-10-18)

Every non-Latin script shows the word in Latin letters, small and italic, under the block and under every word of the sentences panel
(`script.romanize` in the language definition; toggle "Latin letters under each word", on by default).
Greek uses the usual scholarly scheme: η ē, ω ō, θ th, φ ph, χ ch, ψ ps, ξ x, υ y (u in diphthongs),
γ before γ κ ξ χ = n, rough breathing h (ῥ rh), iota subscript i; accents dropped. When the input lacked
marks, the dictionary's spellings are romanised, each distinct result shown (ην: ēn / hēn).
Japanese (romaji), Arabic, Russian, Korean, Chinese (pinyin) and Macedonian get their own `romanize`.
