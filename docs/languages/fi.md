# Finnish in Casus

Built overnight 2026-10-19, the first language on the generic case-language builder (tools/casus_build/generic.py,
src/lang/caseLanguage.js), which the later case languages share.

## What the reader does
- **Fifteen cases on six hues.** Grammatical cases each their own hue (nominative, genitive, partitive); the three inner
  local cases share one (inessive "in", elative "out of", illative "into"), the three outer ones another (adessive "on,
  at", ablative "off, from", allative "onto, to"), and essive, translative, instructive, abessive and comitative a
  sixth. Shared hues differ by border style, and every case has its own badge (Ine, Ela, Ill…). The accusative shares
  the nominative's hue.
- Agreement inside the clause, verb number, coordination with ja/tai, one subject per clause (the shared clause rules).

## Data
- English Wiktionary via kaikki (CC BY-SA), streamed and kept only for the 50,000 commonest subtitle words and their
  forms, closed classes and phrases (tools/fetch_filtered.py) — the full dump is 4.6 GB. Frequency: FrequencyWords fi.

## Not yet
- Possessive suffixes (talossani "in my house"), clitics (-kin, -ko/-kö), consonant gradation shown, postpositions.
