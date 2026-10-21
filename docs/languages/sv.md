# Swedish in Casus

Built 2026-10-21 on the generic builder (caseless, like Dutch) and the shared role rules (src/lang/romance.js), last
of the order Allan accepted (lt, he, sh, ro, **sv**). On Casus World.

- **Roles, not cases**: subject, direct object, indirect object (till / åt + noun) from word order and the pronoun
  forms that keep case (jag / mig, du / dig, han / honom, hon / henne, vi / oss, ni / er, de / dem). Swedish puts the
  verb second, so a subject can follow it (*Idag läser jag*): a subject pronoun keeps its role wherever it stands.
- **Verbs** have no persons: present (läser), preterite (läste), imperative (läs), supine (läst), and the s-passive
  (läsas) — filed by tense and mood only (tools/casus_build/generic.py).
- Data: English Wiktionary via kaikki (CC BY-SA), 313,364 entries (222,082 nouns, many compounds) → 69,305 lemmas with
  a gloss, 337,385 forms (21.1 MB raw).
- Voice: Piper `sv_SE-nst-medium` (CC0) as the natural voice; espeak-ng `sv` otherwise.
- Samples: everyday sentences written for Casus; Richard Dybeck, *Du gamla, du fria* (1844, public domain); Wikipedia's
  *Svenska* (CC BY-SA 4.0).
- Not yet: the double object (*Hon gav honom en present*: honom is the indirect object) read as such, the genitive -s
  as its own role, compounds split into their parts, Learn lessons.
