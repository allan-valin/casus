# Arabic in Casus

Built overnight 2026-10-19.

## What the reader does
- **Right to left.** The sentences panel and the block pool run right to left; a dragged block's caret follows
  (the gap before a block is on its right).
- **Vowels supplied.** Text is usually written without short vowels. Words are looked up by their bare letters and
  the dictionary's fully vowelled spellings are shown over the block, as for Greek accents. A hamza the text writes
  must match (إلى finds إِلَى, not آلِيّ); text written without hamza matches either.
- **Proclitics split off.** و "and", ف "so", ب "with, in", ل "for, to", ك "like" written onto a word become their
  own blocks when the rest is a dictionary word (والكتاب = و + الكتاب; للبيت = ل + البيت).
- **Cases.** Nominative (marfūʕ), accusative (manṣūb), genitive (majrūr) on the hues; dual double border, plural
  dashed. Prepositions govern the genitive and, once they have their object, lose their other readings. In a
  verbal sentence the first free noun after a certain verb is its subject (nominative) and the next its object
  (accusative); adjectives agree with their noun.
- **Latin letters** under every word, as Wiktionary writes them (kitāb, al-kitābu, aš-šams, qurʔān), from the
  vowelled spelling.

## Data
- English Wiktionary via kaikki (CC BY-SA): 31k lemmas, 489k vowelled forms; verbs only when one of their forms
  is among the 50,000 commonest subtitle words (FrequencyWords, CC BY-SA 4.0) — Wiktionary lists 49,000 verbs.
- Keys keep the vowels; shards are named by the bare letters (tools/casus_build/ar/normalize.py =
  src/lang/ar/normalize.js).

## Drills
- Alphabet: 28 letters alone and joined (medial, or final for the six that never join on), by sound or name.
- Noun/adjective and verb tables; "Random word" is approximate for Arabic (patterns are inside the word, the
  comparison works on endings): كتاب finds حجاب and شهاب (the same broken plural), مدرسة the sound feminines.
- Frequent words (subtitles) and phrases.

## Not yet
- The construct state (iḍāfa) chain; nominal sentences (mubtadaʔ/ḵabar); the root and pattern of each word; pronoun
  suffixes split off (كتابه); a natural voice (Piper has ar_JO).
