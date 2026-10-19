# Chinese (Mandarin) in Casus

Built overnight 2026-10-19.

## What the reader does
- **Word splitting.** No spaces: every substring is looked up and the fewest dictionary words win; ties go to the
  commoner words (subtitle frequencies), so 我在学校吃饭 is 我 · 在 · 学校 · 吃饭, not 在学 · 校.
- **Pinyin under each word, the tones in colour** (1 red, 2 green, 3 blue, 4 purple, neutral grey) so they cannot be
  missed; the grammatical particles read in the neutral tone (的 de, 了 le).
- **Grammar is in the function words.** A coverb before a noun gives it its role on the case hues — 在 place, 给/对/向
  to, 从/离 from, 跟/和 with, 把 the object brought before the verb, 被 the agent — whatever the dictionary files the
  coverb as, when a verb follows; 的 after a word makes it the possessor or modifier. Each pair is one chunk.
- Simplified and traditional both read; the dictionary form shows 学校 (學校) xuéxiào.

## Data
- English Wiktionary via kaikki (CC BY-SA): 157k words and characters under both spellings, pinyin on every row;
  single characters get their simplified key from the word pairs (學校/学校: 學 → 学) and a part of speech from their
  gloss ("to eat" a verb). Word frequencies: FrequencyWords zh_cn (CC BY-SA 4.0).

## Drills
- Characters: the 100 commonest, simplified (traditional as the second rows), answered in pinyin with tone marks,
  tone numbers (wo3) or none. Frequent words; phrases and chengyu with pinyin and word by word. No endings drills:
  Chinese does not inflect.

## Not yet
- Measure words linked to their nouns; aspect (了 过 着) shown on the verb; 是…的; resultative complements (看完).

## 2026-10-19 (Allan: grammar complete; single characters are words)
- CC-CEDICT fills the words and readings Wiktionary lacks (38,700 added: 都 dōu "all", frequent names like 北京); a
  neutral-tone duplicate of a word we have (学生 xuésheng) is left out.
- Unihan kMandarin orders a character's readings, the most customary first (都 dōu, 要 yào).
- The frequent-words list has single characters again (的, 我, 是, 都), with plain meanings for the top particles.
