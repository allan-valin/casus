"""Entries Whitaker's program supplies from code rather than from DICTLINE.GEN.

`sum, esse, fui, futurus` is not in DICTLINE: the program builds it from the
stems `s . fu fut` (INFLECTS.LAT, the comment above the V 5 rules), where `.`
is an empty stem — `est` is "" + `est`, `esse` is "" + `esse`, as `adest` is
`ad` + `est`. Written here in DICTLINE's own column layout so the one parser
reads it; the line index is pushed past DICTLINE's 39,335 so ids never collide.
"""

_SUM_GLOSS = "be; exist; (also used to form perfect passive tenses with PPL)"

EXTRA_DICTLINE = [
    f"{'s':<19}{'.':<19}{'fu':<19}{'fut':<19}{'V':<7}{'5 1 TO_BEING':<17}X X X A X {_SUM_GLOSS}",
]

EXTRA_INDEX_OFFSET = 90000  # ids of the extra lines: offset + position in EXTRA_DICTLINE
