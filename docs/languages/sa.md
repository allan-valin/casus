# Sanskrit in Casus

Built overnight 2026-10-19 on the generic case-language builder.

- Eight cases (prathamā … sambodhana) on six hues: the ablative shares the genitive's hue, the vocative the
  nominative's, each with its own border; three numbers (dual on a double border).
- Devanagari with IAST under every word; keys drop Vedic accents and footnote digits, and a word-final anusvara is
  read as the dictionary's final m (वनं = वनम्); sentences end at the danda.
- Devanagari drill: vowels, consonants, consonants with ā.
- Data: the whole English Wiktionary Sanskrit extract (144 MB; 10,200 lemmas, 195k forms). No frequency list exists for
  Sanskrit, so the frequent-words drill is empty.
- Sandhi, the common word-end cases (src/lang/sa/sandhi.js): -o was -aḥ (रामो = रामः), -r was -ḥ, a voiced final
  stop was voiceless, a dropped visarga after -a; the avagraha splits रामोऽपि into रामो + ऽपि (= अपि).
- Not yet: words written together with no space (हरिर्जयति), vowel sandhi across words (रामागच्छति).
