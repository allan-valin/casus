"""German prepositions and the cases they govern (docs/languages/de.md §6), contractions included."""
GOVERNMENT = {
    **{p: ["acc"] for p in ("durch", "für", "gegen", "ohne", "um", "bis", "entlang")},
    **{p: ["dat"] for p in ("aus", "bei", "mit", "nach", "seit", "von", "zu", "gegenüber", "außer", "ab")},
    **{p: ["gen"] for p in ("wegen", "trotz", "während", "statt", "anstatt", "innerhalb", "außerhalb", "aufgrund")},
    "laut": ["gen", "dat"],
    **{p: ["acc", "dat"] for p in ("an", "auf", "hinter", "in", "neben", "über", "unter", "vor", "zwischen")},
    # contractions: preposition + article
    **{p: ["dat"] for p in ("am", "im", "beim", "vom", "zum", "zur", "hinterm", "überm", "unterm", "vorm")},
    **{p: ["acc"] for p in ("ans", "ins", "aufs", "durchs", "fürs", "ums", "übers", "unters", "vors", "hinters")},
}
