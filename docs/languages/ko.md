# Korean in Casus

Built overnight 2026-10-19.

## What the reader does
- **Particles split off.** Korean writes spaces between phrases, with the particles attached (학교에 "at school").
  A phrase that is not itself a dictionary word is cut into word + particle when the word is known (longest particle
  first: 에서 before 에); the common pronouns are cut even where the dictionary lists the whole (저는 = 저 + 는).
- **Particles as roles,** on the same hues as Japanese: 은/는 topic, 이/가 subject, 을/를 object, 에/에게/한테 target,
  에서 place of action, 의 possessor, 와/과/하고/(이)랑 with, (으)로/부터/까지 means, from, until. The word before the
  particle takes the role; the two are one chunk.
- **Verbs** carry their speech level and tense as the badge (해요 haeyo, 합니다 hamnida, 해 hae, 한다 handa; past;
  question). The sentence ends in its verb (가요 is "goes", not "song"); a time word with no particle is the adverb.
- **Revised Romanization** under each word, with the sound changes it writes (한국어 hangugeo, 감사합니다 gamsahamnida).
- Hanja (Sino-Korean characters) shown in the dictionary form where Wiktionary gives them: 학교 (學校).

## Data
- English Wiktionary via kaikki (CC BY-SA): 35,500 lemmas with their conjugations; the particles are written into
  the data with their roles (tools/casus_build/ko/parse.py PARTICLES). Shards: the Japanese bucket hash.

## Drills
- Hangul: 19 consonants and 21 vowels, alone and in a syllable (가, 아), by sound or name.
- Adjective and verb forms: speech level × present, past, question; random words of the same pattern.
- Frequent words (subtitles) and phrases.

## Not yet
- Verb endings beyond Wiktionary's tables (-고, -지만, -는데…) split off; honorific -시-; the copula 이다 after nouns.

- 2026-10-19 morning: the copula after a noun splits off and reads as 이다 (학생이에요 → 학생 + 이에요, 그거야 →
  그거 + 야); a common pronoun is the pronoun (우리 "we", not the pen).
