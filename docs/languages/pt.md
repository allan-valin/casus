# Portuguese (Brazil) in Casus

Built overnight 2026-10-19 on the generic builder, caseless.

- No cases: the colours are the roles — subject (Suj), direct object (OD), indirect object (OI) — read from word order
  and the marked words (src/lang/pt/stages.js):
  - an article before a noun or adjective is the article; o/a/os/as before a verb is the object pronoun (Eu o vejo)
  - lhe/lhes are indirect objects
  - a / para (ao, à, pra, pro…) + a noun phrase after the verb is the indirect object (deu o livro ao irmão)
  - with one verb: the noun phrase before it is the subject, the first bare one after it the direct object
  - noun or verb: after an article a noun (o livro), straight after a noun phrase the verb (o menino lê)
- Closed-class words (articles, clitics, subject pronouns, preposition contractions) come from a Casus table, not the
  dictionary.
- Drills: verb endings only (no noun cases), frequent words from pt-BR subtitles, phrases.
- Data: English Wiktionary via kaikki (CC BY-SA), kept for the 50,000 commonest pt-BR subtitle words.
- Inverted subjects: with nothing before the verb, a verb that puts its subject after it (Casus list: chegar, nascer,
  morrer, cair, acontecer, aparecer…, or Wiktionary marking it intransitive only) has its subject after it (Chegou o trem).
- Not yet: objects fronted for emphasis, a + noun before the verb.
