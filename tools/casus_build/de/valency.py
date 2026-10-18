"""CL10 verb valency (docs/languages/de.md §10): the object cases of common German verbs, from the standard
teaching lists (Duden Grammatik §§ on Valenz; Dreyer/Schmitt "Lehr- und Übungsbuch der deutschen Grammatik",
Verben mit Dativ / Genitiv / Dativ und Akkusativ). Only verbs whose objects are fixed are listed; a verb with
several frames (lesen: acc or none) lists the union, which is what the rule needs: cases it can take.
Intransitive verbs are left out on purpose: adverbial accusatives (den ganzen Tag) would break them."""
from __future__ import annotations

DAT = """antworten begegnen danken drohen fehlen folgen gefallen gehorchen gehören gelingen genügen glauben gratulieren
helfen misslingen missfallen nützen passen passieren raten schaden schmecken vertrauen verzeihen weh widersprechen zuhören
zustimmen zusehen zuschauen ähneln imponieren applaudieren nachlaufen entkommen entgegenkommen""".split()
GEN = "gedenken bedürfen entbehren sich_erinnern".split()
DAT_ACC = """geben schenken zeigen sagen bringen schicken erzählen erklären leihen schreiben empfehlen kaufen anbieten
wegnehmen stehlen verbieten erlauben versprechen reichen senden zeigen beweisen mitteilen liefern überlassen
verkaufen wünschen zurückgeben vorlesen vorstellen leihen borgen glauben""".split()
ACC = """haben sehen finden kennen lieben machen nehmen lesen essen trinken suchen brauchen besuchen hören fragen
bekommen verstehen tragen öffnen schließen halten legen stellen setzen töten fühlen spüren bemerken erwarten rufen
anrufen bauen backen kochen waschen putzen treffen vergessen verlieren holen tun benutzen besitzen beobachten
erreichen erleben fangen füllen grüßen hassen heben küssen malen mögen nennen packen pflanzen retten sammeln schlagen
singen spielen studieren tragen trennen verlassen verletzen werfen ziehen zählen zerstören erkennen ansehen anschauen
aufmachen zumachen mitnehmen""".split()


def valency_table() -> dict[str, list[str]]:
    out: dict[str, set[str]] = {}
    for words, cases in ((ACC, ["acc"]), (DAT, ["dat"]), (GEN, ["gen"]), (DAT_ACC, ["dat", "acc"])):
        for w in words:
            out.setdefault(w, set()).update(cases)
    return {w: sorted(c) for w, c in out.items() if "_" not in w}


def valency_by_lemma(lemmas: dict) -> dict[str, list[str]]:
    """lemma id -> object cases, for the verbs of the table (lemmas: id -> {headword, pos})."""
    table = valency_table()
    return {i: table[r["headword"]] for i, r in lemmas.items() if r.get("pos") == "verb" and r.get("headword") in table}
