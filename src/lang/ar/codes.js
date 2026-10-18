/* Arabic analysis code tables, mirrored from tools/casus_build/ar/codes.py (CODES_JSON). */
export default {
 "POS": {
  "n": "noun",
  "a": "adj",
  "v": "verb",
  "o": "pron",
  "m": "num",
  "d": "adv",
  "r": "prep",
  "c": "conj",
  "k": "particle",
  "j": "interj",
  "p": "ppl"
 },
 "TABLES": {
  "case": {
   "n": "nom",
   "a": "acc",
   "g": "gen",
   "x": "x"
  },
  "number": {
   "s": "sg",
   "d": "du",
   "p": "pl",
   "x": "x"
  },
  "gender": {
   "m": "m",
   "f": "f",
   "x": "x"
  },
  "state": {
   "d": "def",
   "i": "indef",
   "c": "cons",
   "x": "x"
  },
  "person": {
   "1": "1",
   "2": "2",
   "3": "3",
   "x": "x"
  },
  "tense": {
   "p": "past",
   "n": "npast",
   "x": "x"
  },
  "mood": {
   "i": "ind",
   "s": "subj",
   "j": "juss",
   "m": "imp",
   "x": "x"
  },
  "voice": {
   "a": "act",
   "p": "pass",
   "x": "x"
  },
  "governs": {
   "n": "nom",
   "a": "acc",
   "g": "gen",
   "x": "x"
  }
 },
 "LAYOUT": {
  "noun": [
   "case",
   "number",
   "gender",
   "state"
  ],
  "adj": [
   "case",
   "number",
   "gender",
   "state"
  ],
  "num": [
   "case",
   "number",
   "gender",
   "state"
  ],
  "pron": [
   "case",
   "number",
   "gender",
   "state"
  ],
  "ppl": [
   "case",
   "number",
   "gender",
   "state"
  ],
  "verb": [
   "person",
   "number",
   "gender",
   "tense",
   "mood",
   "voice"
  ],
  "adv": [],
  "prep": [
   "governs"
  ],
  "conj": [],
  "particle": [],
  "interj": []
 }
};
