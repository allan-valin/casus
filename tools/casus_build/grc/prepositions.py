"""Ancient Greek prepositions and the cases they govern (docs/languages/grc.md §4; Smyth 1681–1702).
Keys are normalize_grc() forms; elided forms map through ELISIONS in the tokenizer."""
GOVERNMENT = {
    "ἀντί": ["gen"], "ἀπό": ["gen"], "ἐκ": ["gen"], "ἐξ": ["gen"], "πρό": ["gen"],
    "ἐν": ["dat"], "σύν": ["dat"], "ξύν": ["dat"],
    "ἀνά": ["acc"], "εἰς": ["acc"], "ἐς": ["acc"],
    "διά": ["gen", "acc"], "κατά": ["gen", "acc"], "μετά": ["gen", "acc"], "ὑπέρ": ["gen", "acc"],
    "ἀμφί": ["gen", "dat", "acc"], "ἐπί": ["gen", "dat", "acc"], "παρά": ["gen", "dat", "acc"],
    "περί": ["gen", "dat", "acc"], "πρός": ["gen", "dat", "acc"], "ὑπό": ["gen", "dat", "acc"],
}
# a preposition written with a grave accent in running text (ἀπὸ, ἐπὶ) is the same word
GRAVE_TO_ACUTE = str.maketrans({"̀": "́"})
