/* Macedonian analysis code tables, mirrored from tools/casus_build/mk/codes.py (CODES_JSON). */
export default {
 "POS": {
  "n": "noun",
  "a": "adj",
  "v": "verb",
  "o": "pron",
  "t": "det",
  "m": "num",
  "d": "adv",
  "r": "prep",
  "c": "conj",
  "k": "particle",
  "j": "interj"
 },
 "TABLES": {
  "case": {
   "i": "indef",
   "d": "def",
   "p": "prox",
   "s": "dist",
   "v": "voc",
   "x": "x"
  },
  "number": {
   "s": "sg",
   "p": "pl",
   "x": "x"
  },
  "gender": {
   "m": "m",
   "f": "f",
   "n": "n",
   "x": "x"
  },
  "person": {
   "1": "1",
   "2": "2",
   "3": "3",
   "x": "x"
  },
  "tense": {
   "p": "pres",
   "i": "impf",
   "a": "aor",
   "m": "imp",
   "l": "lpart",
   "x": "x"
  },
  "aspect": {
   "i": "impf",
   "p": "pf",
   "x": "x"
  }
 },
 "LAYOUT": {
  "noun": [
   "case",
   "number",
   "gender"
  ],
  "adj": [
   "case",
   "number",
   "gender"
  ],
  "pron": [
   "case",
   "number",
   "gender"
  ],
  "det": [
   "case",
   "number",
   "gender"
  ],
  "num": [
   "case",
   "number",
   "gender"
  ],
  "verb": [
   "person",
   "number",
   "gender",
   "tense",
   "aspect"
  ],
  "adv": [],
  "prep": [],
  "conj": [],
  "particle": [],
  "interj": []
 }
};
