"""A generic Wiktextract parser for the case languages still to come (overnight 2026-10-19: Finnish, Czech, Polish,
Turkish, Hungarian, Icelandic, Modern Greek, Sanskrit), configured per language by its list of cases. Nominals by case,
number and gender; verbs by person, number, tense and mood; multiword cells, romanisation and form-of entries left out.
Codes are generated from the configuration (CODES_JSON per language)."""
from __future__ import annotations

import json
import re
import string
import unicodedata
from collections.abc import Iterable, Iterator

_WORD = re.compile(r"[^\W\d_]")
POS = {"noun": "noun", "name": "noun", "adj": "adj", "verb": "verb", "pron": "pron", "det": "det", "num": "num", "adv": "adv",
       "prep": "prep", "postp": "prep", "conj": "conj", "particle": "particle", "intj": "interj", "article": "det"}
NUMBERS = {"singular": "sg", "plural": "pl", "dual": "du"}
GENDERS = {"masculine": "m", "feminine": "f", "neuter": "n"}
PERSONS = {"first-person": "1", "second-person": "2", "third-person": "3"}
TENSES = {"present": "pres", "past": "past", "future": "fut", "imperfect": "impf", "aorist": "aor", "perfect": "perf", "preterite": "past"}
MOODS = {"indicative": "ind", "conditional": "cond", "imperative": "imp", "subjunctive": "subj", "potential": "pot", "optative": "opt"}
SKIP = {"romanization", "table-tags", "inflection-template", "multiword-construction", "diminutive", "augmentative", "class",
        "comparative", "superlative", "dated", "obsolete", "archaic", "alternative", "canonical", "error-unrecognized-form",
        "connegative", "participle", "infinitive", "possessive", "dialectal", "rare"}


def _lower(f: str) -> str:
    return f.lower()


def strip_el(s: str) -> str:
    """Modern Greek key: lower case, no tonos or diaeresis, final sigma folded (mirror of src/lang/el/script.js)"""
    import unicodedata
    d = unicodedata.normalize("NFD", s.lower())
    return unicodedata.normalize("NFC", "".join(c for c in d if c not in "\u0301\u0308\u0344")).replace("ς", "σ")


class Config:
    def __init__(self, code: str, cases: list[str], case_tags: dict[str, str], script: str = r"\p{L}", key=_lower, clean=None, caseless=False):
        self.caseless = caseless                 # no cases (Portuguese): the role comes from the page's word-order rules
        self.key = key                           # how a form is keyed for its shard (Greek: without accents)
        self.clean = clean or (lambda t: t)      # how a form is written as a key (Sanskrit: no Vedic accents)
        self.code = code
        self.cases = cases                       # our case ids, in the language's school order
        self.case_tags = case_tags               # wiktextract tag -> case id
        self.letters = re.compile(r"[^\W\d_]")


def _one(tags, table):
    hits = [v for k, v in table.items() if k in tags]
    return hits[0] if len(hits) == 1 else None


def analysis(cfg: Config, pos: str, tags: set, gender: str | None) -> dict | None:
    if pos in ("noun", "adj", "pron", "det", "num"):
        if cfg.caseless:
            return {"pos": pos, "number": _one(tags, NUMBERS) or ("sg" if pos in ("noun", "adj") else None),
                    "gender": _one(tags, GENDERS) or (gender if pos in ("noun", "adj") else None)}
        cases = [v for k, v in cfg.case_tags.items() if k in tags]
        if not cases and "error-unrecognized-form" in tags and pos in ("pron", "det") and (_one(tags, GENDERS) or _one(tags, NUMBERS)):
            # a pronoun table Wiktextract could not read (Polish mój): the form is known, its case is not
            return {"pos": pos, "number": _one(tags, NUMBERS), "gender": _one(tags, GENDERS)}
        if len(set(cases)) != 1:
            return None
        return {"pos": pos, "case": cases[0], "number": _one(tags, NUMBERS) or ("sg" if pos == "noun" else None),
                "gender": _one(tags, GENDERS) or (gender if pos == "noun" else None)}
    if pos == "verb" and {"participle", "past"} <= tags and _one(tags, GENDERS) and not tags & set(PERSONS) and "passive" not in tags \
            and cfg.code in ("cs", "pl"):
        return {"pos": "verb", "tense": "past", "mood": "ind", "gender": _one(tags, GENDERS), "number": _one(tags, NUMBERS) or "sg"}
    if pos == "verb" and "participle" in tags:
        return {"pos": "verb", "mood": "part", "tense": _one(tags, TENSES), "gender": _one(tags, GENDERS), "number": _one(tags, NUMBERS),
                **({"voice": "pass"} if "passive" in tags else {})}
    if pos == "verb" and cfg.code == "id":
        # Indonesian verbs show voice, not person or tense: membaca (active), dibaca (passive), baca (imperative, bare)
        if tags & {"active", "passive", "imperative"}:
            return {"pos": "verb", "mood": "imp" if "imperative" in tags else "ind", **({"voice": "pass"} if "passive" in tags else {})}
        return None
    if pos == "verb" and cfg.code == "sv" and not tags & set(PERSONS):
        # Swedish verbs have no persons: läser (present), läste (preterite), läs (imperative), läst (supine)
        if "infinitive" in tags:
            return {"pos": "verb", "mood": "inf", **({"voice": "pass"} if "passive" in tags else {})}
        if "supine" in tags:
            return {"pos": "verb", "mood": "part", "tense": "past", **({"voice": "pass"} if "passive" in tags else {})}
        mood = "imp" if "imperative" in tags else "subj" if "subjunctive" in tags else "ind"
        tense = "past" if tags & {"preterite", "past"} else "pres"
        if not tags & {"present", "preterite", "past", "imperative", "subjunctive"}:
            return None
        return {"pos": "verb", "tense": tense, "mood": mood, **({"voice": "pass"} if "passive" in tags else {})}
    if pos == "verb" and cfg.code == "he" and "present" in tags and _one(tags, NUMBERS) and not tags & set(PERSONS):
        # the Hebrew present is a participle by gender and number, any person (אני / אתה / הוא לומד)
        return {"pos": "verb", "tense": "pres", "mood": "ind", "number": _one(tags, NUMBERS), "gender": _one(tags, GENDERS)}
    if pos == "verb" and cfg.code == "bn" and _one(tags, PERSONS) and not _one(tags, NUMBERS):
        # Bengali verbs have person (and familiar / polite), not number: পড়ি, পড়িস, পড়েন
        return {"pos": "verb", "person": _one(tags, PERSONS), "tense": _one(tags, TENSES) or "pres", "mood": _one(tags, MOODS) or "ind"}
    if pos == "verb":
        person, number = _one(tags, PERSONS), _one(tags, NUMBERS)
        if not person or not number:
            return None
        if cfg.code == "he":
            return {"pos": "verb", "person": person, "number": number, "tense": _one(tags, TENSES) or "pres", "mood": _one(tags, MOODS) or "ind",
                    "gender": _one(tags, GENDERS), **({"voice": "pass"} if "passive" in tags else {})}
        return {"pos": "verb", "person": person, "number": number, "tense": _one(tags, TENSES) or "pres", "mood": _one(tags, MOODS) or "ind",
                **({"voice": "pass"} if tags & {"passive", "mediopassive"} else {}), **({"polarity": "neg"} if "negative" in tags else {})}
    return None


def turkish_person(form: str) -> tuple[str, str]:
    """Turkish person and number from the personal ending (Wiktionary's Turkish tables have their person tags shifted by a
    row): -sInIz 2pl, -lAr 3pl, -sIn 2sg, -Iz 1pl, -k after a past -dI 1pl, -(I)m 1sg, else 3sg"""
    f = form.lower()
    if re.search(r"(sınız|siniz|sunuz|sünüz|nız|niz|nuz|nüz)$", f):
        return ("2", "pl")
    if re.search(r"(lar|ler)$", f):
        return ("3", "pl")
    if re.search(r"(sın|sin|sun|sün)$", f):
        return ("2", "sg")
    if re.search(r"(ız|iz|uz|üz)$", f) or re.search(r"[dt][ıiuü]k$", f):
        return ("1", "pl")
    if re.search(r"m$", f):
        return ("1", "sg")
    return ("3", "sg")


def hungarian_person(form: str, headword: str, definite: bool, past: bool) -> tuple[str, str]:
    """Hungarian person and number from the personal ending (Wiktionary's Hungarian tables come with their person tags
    a row off). The 3rd singular present is the headword itself."""
    f = form.lower()
    end = lambda pat: re.search(f"({pat})$", f)                      # noqa: E731
    if past:
        if end("tatok|tetek|tátok|tétek"):
            return ("2", "pl")
        if end("tunk|tünk|tuk|tük"):
            return ("1", "pl")
        if end("tak|tek|ták|ték"):
            return ("3", "pl")
        if end("tam|tem|talak|telek"):
            return ("1", "sg")
        if end("tál|tél|tad|ted"):
            return ("2", "sg")
        return ("3", "sg")
    if f == headword.lower():
        return ("3", "sg")
    if end("játok|itek|tok|tek|tök"):
        return ("2", "pl")
    # the definite j assimilates after a sibilant (olvassák, olvassuk)
    if end("nak|nek") or (definite and end("ák|ék|ik")):
        return ("3", "pl")
    if end("unk|ünk") or (definite and end("uk|ük")):
        return ("1", "pl")
    if end("lak|lek|ok|ek|ök|om|em|öm"):
        return ("1", "sg")
    if end("sz|ol|el|öl|od|ed|öd"):
        return ("2", "sg")
    return ("3", "sg")


def parse_entries(cfg: Config, lines: Iterable[str]) -> Iterator[dict]:
    for i, line in enumerate(lines):
        line = line.strip()
        if not line:
            continue
        d = json.loads(line)
        pos = POS.get(d.get("pos", ""))
        word = (d.get("word") or "").strip()
        if not pos or not word or (" " in word and cfg.code != "vi"):   # Vietnamese words are space-separated syllables
            continue                                  # names stay (Praha, Praze: v + locative)
        senses = d.get("senses") or []
        # an alternative form of a closed-class word is a word of its own (Czech ve for v before some consonants)
        form_of = senses and all(set(x.get("tags") or []) & {"form-of", "alt-of"} for x in senses)
        # a word filed only as a form of another is read from its sense's tags (Greek σου: genitive of εσύ; Sanskrit
        # उवाच: perfect of वच्); kept only when the tags give a reading
        form_of_tags = set(senses[0].get("tags") or []) if form_of and pos not in ("prep", "conj", "particle", "adv") else None
        gender = next((v for k, v in GENDERS.items() if any(k in (s.get("tags") or []) for s in senses)), None)
        if gender is None and cfg.code in ("lt", "he", "sh") and pos in ("noun",):
            # these dumps put the gender on the canonical form (kȕća: canonical, feminine), not on the senses
            canon = next((set(f.get("tags") or []) for f in d.get("forms") or [] if "canonical" in (f.get("tags") or [])), set())
            gender = _one(canon, GENDERS)
        # intransitive: some sense says so and none says transitive (chegar "to arrive")
        intransitive = pos == "verb" and any("intransitive" in (x.get("tags") or []) for x in senses) \
            and not any("transitive" in (x.get("tags") or []) for x in senses)
        cells = []
        seen_person: dict = {}                    # (tense, number, gender) -> how many untagged persons so far
        for f in d.get("forms") or []:
            tags = set(f.get("tags") or [])
            # Polish-style tables give 1st and 2nd person by row order only: supply the person from that order
            if pos == "verb" and cfg.code != "he" and not tags & set(PERSONS) and _one(tags, NUMBERS) and _one(tags, TENSES) and not tags & {"impersonal", "infinitive", "participle"}:
                k = (_one(tags, TENSES), _one(tags, NUMBERS), _one(tags, GENDERS), "virile" in tags)
                n = seen_person.get(k, 0)
                seen_person[k] = n + 1
                if n < 3:
                    tags = tags | {["first-person", "second-person", "third-person"][n]}
            text = cfg.clean((f.get("form") or "").strip())
            # a key must be a word: it starts with a letter and has no slash (an IPA cell filed as a form once tried to
            # become the shard "/ˈ", a path outside the data folder)
            definite = ("def" if "definite" in tags else "indef" if "indefinite" in tags else None) if cfg.code == "hu" else None
            if cfg.code == "hu" and pos == "verb":
                # Hungarian tables come tagged as unrecognised, persons a row off: the person from the ending, tense and
                # definiteness from the tags; moods other than the indicative are left out (their tags are unreliable)
                if tags & {"conditional", "subjunctive", "imperative", "infinitive", "participle"} or not text or " " in text:
                    continue
                if tags & set(PERSONS) or tags & {"definite", "indefinite"}:
                    person, number = hungarian_person(text, word, definite="definite" in tags, past="past" in tags)
                    tags = {"past" if "past" in tags else "present", "indicative", {"1": "first-person", "2": "second-person", "3": "third-person"}[person],
                            {"sg": "singular", "pl": "plural"}[number]}
            if cfg.code == "tl" and pos == "verb":
                # Tagalog aspect: completive (bumasa, nagbasa) as past, progressive (bumabasa) as present,
                # contemplative (babasa) as future
                tags = {{"completive": "past", "progressive": "present", "contemplative": "future"}.get(t, t) for t in tags}
            skip = SKIP - {"error-unrecognized-form"} if pos in ("pron", "det", "num") else SKIP
            if cfg.code == "ro" and pos == "adj":
                skip = skip - {"error-unrecognized-form"}      # Romanian adjective tables come untagged for case
            if pos == "verb" and "participle" in tags:
                # the Slavic past is the l-participle by gender and number (Czech byl, byla); other participles are
                # kept as participles (Turkish yüzen "swimming")
                skip = skip - {"participle"}
            owner = None
            if cfg.code == "tr" and pos == "noun" and "possessive" in tags:
                # evine "to his house": the case stays; the number is the house's (possessed-single/-many), the owner's
                # person and number go to `poss` (evime: 1sg)
                skip = skip - {"possessive"}
                if _one(tags, PERSONS) and _one(tags, NUMBERS):
                    owner = _one(tags, PERSONS) + _one(tags, NUMBERS)
                tags = (tags - set(NUMBERS) - set(PERSONS)) | {"plural" if "possessed-many" in tags else "singular"}
            if not text or " " in text or tags & skip or not cfg.letters.match(text) or "/" in text or "\\" in text:
                continue
            if cfg.code == "tr" and pos == "verb" and tags & set(PERSONS):
                person, number = turkish_person(text)            # the table's own person tags are a row off
                tags = (tags - set(PERSONS) - set(NUMBERS)) | {{"1": "first-person", "2": "second-person", "3": "third-person"}[person], {"sg": "singular", "pl": "plural"}[number]}
            if cfg.code == "ro" and pos in ("noun", "adj", "pron", "det", "num"):
                for tg in _ro_cases(tags, text):
                    a = analysis(cfg, pos, tg, gender)
                    if a:
                        cells.append((text, a))
                continue
            a = analysis(cfg, pos, tags, gender)
            if a:
                if owner:
                    a["poss"] = owner
                if definite and pos == "verb":
                    a["definite"] = definite
                if intransitive and a.get("pos") == "verb":
                    a["valency"] = "intr"
                cells.append((text, a))
        if cfg.code == "lt" and pos == "verb":
            cells += _lt_verb_cells(d.get("forms") or [], word)
        if cfg.code == "lt" and pos == "noun" and not cells and not form_of:
            from casus_build.lt import noun_forms
            tags = {t for f in d.get("forms") or [] for t in f.get("tags") or []}
            g = gender or ("m" if "masculine" in tags and "feminine" not in tags else "f" if "feminine" in tags and "masculine" not in tags else None)
            cells += noun_forms(word, g)
        if cfg.code == "he":
            from casus_build.he import plene, strip_he
            cells += [(plene(t), dict(a)) for t, a in cells if plene(t) != strip_he(t)]   # the full spelling texts use
        if form_of_tags and not cells:
            fa = analysis(cfg, pos, form_of_tags, gender)
            if fa:
                cells.append((cfg.clean(word), fa))
        word = cfg.clean(word)
        if cfg.caseless and pos in ("noun", "adj", "det", "pron", "num") and not any(t == word for t, _ in cells):
            cells.insert(0, (word, {"pos": pos, "number": "sg", "gender": gender or ("m" if pos == "adj" else None)}))  # the headword is the (masculine) singular
        if cfg.code == "fa" and pos in ("noun", "adj") and not form_of:
            # Persian: the plural -ها and the ezafe / indefinite -ی are written on (with or without the non-joiner)
            base = cfg.clean(word)
            extra = [(base + "ها", {"pos": pos, "number": "pl"}), (base + "های", {"pos": pos, "number": "pl"}),
                     (base + ("ی" if not base.endswith(("ا", "و", "ه", "ی")) else "یی" if base.endswith(("ا", "و")) else "ی"), {"pos": pos, "number": "sg"})]
            cells += [(t, a) for t, a in extra if not any(t == x for x, _ in cells)]
        if cfg.code == "fa" and pos == "verb":
            # negation is the prefix ن- (نمی‌روم, نرفتم)
            cells += [("ن" + t, {**a, "polarity": "neg"}) for t, a in cells if a.get("mood") in ("ind", "subj", "imp") and not t.startswith("ن")]
        if cfg.code == "bn" and pos == "noun" and not form_of and not any(a.get("case") for _, a in cells):
            from casus_build.bn import noun_forms as _bn_nouns
            cells += _bn_nouns(cfg.clean(word))
        if cfg.code == "bn" and pos == "pron" and not any(t == word for t, _ in cells):
            cells.insert(0, (word, {"pos": "pron", "case": "nom"}))           # Bengali pronoun tables list only the other cases
        if cfg.code == "hu" and pos == "verb" and not any(t == word for t, _ in cells):
            cells.insert(0, (word, {"pos": "verb", "person": "3", "number": "sg", "tense": "pres", "mood": "ind"}))  # the headword is the 3rd singular
        if pos in ("verb",) and not any(t == word for t, _ in cells):
            cells.append((word, {"pos": "verb", "mood": "inf"}))
        gloss = "; ".join(dict.fromkeys(" ".join(g.split()) for s in senses for g in (s.get("glosses") or [])[:1] if g))
        if not gloss:
            continue
        ipa = [{"ipa": s["ipa"], "tags": list(s.get("tags") or [])} for s in d.get("sounds") or [] if s.get("ipa")]
        base = next((f.get("word") for x in senses for f in (x.get("form_of") or []) if f.get("word")), None) if form_of else None
        yield {"id": i, "headword": word, "pos": pos, "gender": gender, "cells": cells, "gloss_en": gloss, "ipa": ipa[:3], "form_of": bool(form_of),
               **({"form_of_word": base} if base else {})}


_RO_CASES = ("nominative", "accusative", "genitive", "dative", "vocative")


def _ro_cases(tags: set, text: str) -> list[set]:
    """Romanian cells name two cases at once (nominative-accusative, genitive-dative): one reading each; adjective
    cells name none, so the ending decides (-ului, -ei, -lor: genitive-dative)"""
    have = [c for c in _RO_CASES if c in tags]
    base = tags - set(_RO_CASES) - {"error-unrecognized-form"}
    if not have:
        have = ["genitive", "dative"] if text.lower().endswith(("ului", "ei", "lor")) else ["nominative", "accusative"]
    return [base | {c} for c in have]


def _key_ro(s: str) -> str:
    """Romanian keys: lower case, the old cedilla letters ş ţ folded into the comma ones ș ț (mirror of src/lang/ro/script.js)"""
    return s.lower().replace("ş", "ș").replace("ţ", "ț")


def _lt_verb_cells(forms: list[dict], word: str) -> list:
    """Lithuanian finite forms: the full table by position, else from the principal parts (casus_build/lt.py)"""
    from casus_build.lt import table_forms, verb_forms
    table = [f.get("form") or "" for f in forms if "error-unrecognized-form" in (f.get("tags") or [])]
    p3 = next((f["form"] for f in forms if set(f.get("tags") or []) == {"present", "third-person"}), None)
    q3 = next((f["form"] for f in forms if set(f.get("tags") or []) == {"past", "third-person"}), None)
    cells = table_forms(table) if len(table) == 53 else verb_forms(word, p3, q3) if p3 and q3 else []
    # negation is written as one word with the verb (nesuprantu, nebuvo); nėra is the negated yra
    neg = [("ne" + f, {**a, "polarity": "neg"}) for f, a in cells if a.get("mood") in ("ind", "cond", "imp")]
    if word == "būti":
        neg += [("nėra", {"pos": "verb", "tense": "pres", "mood": "ind", "person": "3", "number": n, "polarity": "neg"}) for n in ("sg", "pl")]
    return cells + neg


def fold_form_of(entries: list[dict]) -> list[dict]:
    """a form-of entry whose base lemma is in the dictionary (same part of speech) gives its readings to that lemma and
    is left out: Italian and others file every inflected form as an entry of its own (450,000 of them)"""
    base = {}
    for e in entries:
        if not e.get("form_of"):
            base.setdefault((e["headword"], e["pos"]), e)
    out = []
    for e in entries:
        target = base.get((e.get("form_of_word"), e["pos"])) if e.get("form_of") else None
        if target is None:
            out.append(e)
            continue
        for c in e["cells"]:
            if c not in target["cells"]:
                target["cells"].append(c)
    return out


def used_entries(entries: list[dict], index: dict) -> list[dict]:
    """the entries some form still points to: a form-of entry whose every form its real lemma covers (build_index drops
    its rows) is left out of the lemmas, glosses and IPA (Italian: 450,000 such entries, 48 MB of lemmas)"""
    used = {r["lemma"] for rows in index.values() for r in rows}
    return [e for e in entries if not e.get("form_of") or e["id"] in used]


def build_index(entries: list[dict]) -> dict[str, list[dict]]:
    index: dict[str, list[dict]] = {}
    for e in entries:
        base = {"lemma": e["id"], "pos": e["pos"]}
        for text, a in (e["cells"] or [(e["headword"], {"pos": e["pos"]})]):
            if not _WORD.match(text) or "/" in text or "\\" in text:
                continue                                  # 7/24 and the like are no keys
            full = {**base, **{k: v for k, v in a.items() if k != "pos" and v is not None}}
            rows = index.setdefault(text.lower(), [])
            if full not in rows:
                rows.append(full)
    # a form-of entry (Turkish gittim, "first-person singular past of gitmek") never doubles a form its real lemma covers
    form_of_ids = {e["id"] for e in entries if e.get("form_of")}
    for form, rows in index.items():
        real = {r["pos"] for r in rows if r["lemma"] not in form_of_ids}
        if real:
            index[form] = [r for r in rows if r["lemma"] not in form_of_ids or r["pos"] not in real]
    # pronouns that share one table (Icelandic ég, þú, hún…) each list every form: a form that is some pronoun's own
    # headword belongs to that pronoun only
    pron_head = {e["headword"].lower(): e["id"] for e in entries if e["pos"] == "pron"}
    for form, rows in index.items():
        own = pron_head.get(form)
        if own is not None and any(r["lemma"] == own for r in rows):
            index[form] = [r for r in rows if r["pos"] != "pron" or r["lemma"] == own]
    return index


def codes(cfg: Config):
    case = {c: ch for c, ch in zip(cfg.cases, string.ascii_letters)}
    case.update({"x": "_", None: "_"})
    number = {"sg": "s", "pl": "p", "du": "d", "x": "_", None: "_"}
    gender = {"m": "m", "f": "f", "n": "n", "x": "_", None: "_"}
    person = {"1": "1", "2": "2", "3": "3", "x": "_", None: "_"}
    tense = {"pres": "p", "past": "r", "fut": "f", "impf": "i", "aor": "a", "perf": "e", "x": "_", None: "_"}
    mood = {"ind": "i", "cond": "c", "imp": "m", "subj": "s", "pot": "o", "opt": "t", "inf": "n", "part": "r", "x": "_", None: "_"}
    voice = {"act": "a", "pass": "p", "x": "_", None: "_"}
    polarity = {"neg": "n", "x": "_", None: "_"}
    definite = {"def": "d", "indef": "i", "x": "_", None: "_"}                    # Hungarian conjugations
    valency = {"intr": "i", "x": "_", None: "_"}                                # every sense intransitive (pt chegar)
    poss = {f"{p}{n}": ch for (p, n), ch in zip([(p, n) for p in "123" for n in ("sg", "pl")], "abcdef")} | {"x": "_", None: "_"}   # Turkish possessor
    pos_codes = {"noun": "n", "adj": "a", "verb": "v", "pron": "o", "det": "t", "num": "m", "adv": "d", "prep": "r", "conj": "c", "particle": "k", "interj": "j"}
    nominal = (("case", case), ("number", number), ("gender", gender), ("poss", poss))
    layout = {p: nominal for p in ("noun", "adj", "pron", "det", "num")}
    # a verb: person, number, tense, mood; the Slavic past's gender, the voice (Greek mediopassive), negation (Turkish)
    layout.update({"verb": (("person", person), ("number", number), ("tense", tense), ("mood", mood), ("gender", gender), ("voice", voice), ("polarity", polarity), ("definite", definite), ("valency", valency)), "adv": (), "prep": (), "conj": (), "particle": (), "interj": ()})
    back = {name: {v: k for k, v in t.items() if k is not None} for lay in layout.values() for name, t in lay}

    def encode(a: dict) -> str:
        return pos_codes[a["pos"]] + "".join(t[a.get(n)] for n, t in layout[a["pos"]])

    def decode(code: str, lemma: str) -> dict:
        pos = {v: k for k, v in pos_codes.items()}[code[0]]
        out = {"lemma": lemma, "pos": pos}
        for (n, _t), ch in zip(layout[pos], code[1:]):
            v = back[n][ch]
            if v != "x":
                out[n] = v
        return out

    json_ = {"POS": {v: k for k, v in pos_codes.items()},
             "TABLES": {n: {v: k for k, v in t.items() if k is not None} for n, t in (("case", case), ("number", number), ("gender", gender), ("person", person), ("tense", tense), ("mood", mood), ("voice", voice), ("polarity", polarity), ("definite", definite), ("poss", poss), ("valency", valency))},
             "LAYOUT": {p: [n for n, _t in lay] for p, lay in layout.items()}}
    return encode, decode, json_


FINNISH = Config("fi", ["nom", "gen", "par", "acc", "ine", "ela", "ill", "ade", "abl", "all", "ess", "tra", "ins", "abe", "com"],
                 {"nominative": "nom", "genitive": "gen", "partitive": "par", "accusative": "acc", "inessive": "ine", "elative": "ela",
                  "illative": "ill", "adessive": "ade", "ablative": "abl", "allative": "all", "essive": "ess", "translative": "tra",
                  "instructive": "ins", "abessive": "abe", "comitative": "com"})
CONFIGS = {"fi": FINNISH}

GREEK = Config("el", ["nom", "gen", "acc", "voc"], {"nominative": "nom", "genitive": "gen", "accusative": "acc", "vocative": "voc"}, key=strip_el)
CONFIGS["el"] = GREEK


def clean_sa(s: str) -> str:
    """Sanskrit key: no Vedic accents (U+0951–0954, U+1CD0–1CFF) or footnote digits (mirror of src/lang/sa/script.js)"""
    import re as _re
    s = _re.sub("[\u0951-\u0954\u1cd0-\u1cff0-9]", "", s)
    s = _re.sub("[\u0919\u091e\u0923\u0928\u092e]\u094d(?=[\u0915-\u0939])", "\u0902", s)   # सञ्जय = संजय
    return _re.sub("\u0902$", "\u092e\u094d", s)


SANSKRIT = Config("sa", ["nom", "acc", "ins", "dat", "abl", "gen", "loc", "voc"],
                  {"nominative": "nom", "accusative": "acc", "instrumental": "ins", "dative": "dat", "ablative": "abl",
                   "genitive": "gen", "locative": "loc", "vocative": "voc"}, clean=clean_sa)
CONFIGS["sa"] = SANSKRIT

SLAVIC_TAGS = {"nominative": "nom", "genitive": "gen", "dative": "dat", "accusative": "acc", "vocative": "voc", "locative": "loc",
               "prepositional": "loc", "instrumental": "ins"}
CONFIGS["cs"] = Config("cs", ["nom", "gen", "dat", "acc", "voc", "loc", "ins"], SLAVIC_TAGS)
CONFIGS["pl"] = Config("pl", ["nom", "gen", "dat", "acc", "ins", "loc", "voc"], SLAVIC_TAGS)
CONFIGS["is"] = Config("is", ["nom", "acc", "dat", "gen"], {"nominative": "nom", "accusative": "acc", "dative": "dat", "genitive": "gen"})
CONFIGS["tr"] = Config("tr", ["nom", "acc", "dat", "loc", "abl", "gen", "ins"],
                       {"nominative": "nom", "accusative": "acc", "dative": "dat", "locative": "loc", "ablative": "abl", "genitive": "gen",
                        "instrumental": "ins", "comitative": "ins"})
CONFIGS["hu"] = Config("hu", ["nom", "acc", "dat", "ine", "ela", "ill", "sup", "del", "sub", "ade", "abl", "all", "ins", "cau", "tra", "ter", "ess", "for"],
                       {"nominative": "nom", "accusative": "acc", "dative": "dat", "inessive": "ine", "elative": "ela", "illative": "ill",
                        "superessive": "sup", "delative": "del", "sublative": "sub", "adessive": "ade", "ablative": "abl", "allative": "all",
                        "instrumental": "ins", "causal-final": "cau", "translative": "tra", "terminative": "ter", "essive-formal": "for",
                        "essive-modal": "ess", "essive": "ess"})
CONFIGS["pt"] = Config("pt", [], {}, caseless=True)
CONFIGS["fr"] = Config("fr", [], {}, caseless=True)
CONFIGS["es"] = Config("es", [], {}, caseless=True)
CONFIGS["en"] = Config("en", [], {}, caseless=True)
CONFIGS["it"] = Config("it", [], {}, caseless=True)
CONFIGS["nl"] = Config("nl", [], {}, caseless=True)
CONFIGS["uk"] = Config("uk", ["nom", "gen", "dat", "acc", "ins", "loc", "voc"], SLAVIC_TAGS)


def _strip_lt(s: str) -> str:
    from casus_build.lt import strip_lt
    return strip_lt(s)


def _strip_he(s: str) -> str:
    from casus_build.he import strip_he
    return strip_he(s)


def _strip_sh(s: str) -> str:
    from casus_build.sh import strip_sh
    return strip_sh(s)


def _clean_bn(t: str) -> str:
    """Bengali cells carry their romanization and options in the same string (মানুষটি (manushṭa…), মানুষদের(কে)):
    the Bengali word before them"""
    import re as _re
    return _re.split(r"[\s(/,]", t.strip(), maxsplit=1)[0]


def _strip_fa(s: str) -> str:
    from casus_build.fa import strip_fa
    return strip_fa(s)


def _clean_fa(s: str) -> str:
    from casus_build.fa import clean_fa
    return clean_fa(s)


def _strip_tl(s: str) -> str:
    # Wiktionary writes the stress and glottal stop (aklát, bumasâ); texts do not
    return unicodedata.normalize("NFC", "".join(c for c in unicodedata.normalize("NFD", s) if c not in "\u0301\u0300\u0302")).lower()


CONFIGS["tl"] = Config("tl", [], {}, caseless=True, key=_strip_tl)
CONFIGS["sw"] = Config("sw", [], {}, caseless=True)
CONFIGS["fa"] = Config("fa", [], {}, caseless=True, key=_strip_fa, clean=_clean_fa)
CONFIGS["vi"] = Config("vi", [], {}, caseless=True)
CONFIGS["id"] = Config("id", [], {}, caseless=True)
CONFIGS["bn"] = Config("bn", ["nom", "obj", "gen", "loc"], {"nominative": "nom", "objective": "obj", "genitive": "gen", "locative": "loc"},
                       key=lambda f: __import__("unicodedata").normalize("NFC", f), clean=_clean_bn)
CONFIGS["hi"] = Config("hi", ["dir", "obl", "voc", "erg", "dat", "gen"],
                       {"direct": "dir", "oblique": "obl", "indirect": "obl", "vocative": "voc", "ergative": "erg", "dative": "dat", "genitive": "gen"},
                       key=lambda f: __import__("unicodedata").normalize("NFC", f))
CONFIGS["sv"] = Config("sv", [], {}, caseless=True)
CONFIGS["ro"] = Config("ro", ["nom", "acc", "gen", "dat", "voc"], {"nominative": "nom", "accusative": "acc", "genitive": "gen", "dative": "dat", "vocative": "voc"}, key=_key_ro)
CONFIGS["sh"] = Config("sh", ["nom", "gen", "dat", "acc", "voc", "loc", "ins"], SLAVIC_TAGS, key=_strip_sh)
CONFIGS["he"] = Config("he", [], {}, caseless=True, key=_strip_he, clean=lambda t: t.replace("\u05BE", ""))
CONFIGS["lt"] = Config("lt", ["nom", "gen", "dat", "acc", "ins", "loc", "voc"], SLAVIC_TAGS, key=_strip_lt)
