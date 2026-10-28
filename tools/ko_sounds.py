#!/usr/bin/env python3
"""Korean as it is said, not as it is spelled (plan rule 6, 2026-10-27): 같이 is [가치], 먹는 [멍는], 학교 [학꾜].

The Korean Piper voice (kss) was trained on espeak-ng's Korean phonemes, and espeak-ng reads hangul letter by letter
for most of the standard sound rules (먹는 → mʌqnɯn, 신라 → sinɾa). So a line is first rewritten in pronounced hangul
with the rules of 표준 발음법 that change letters across a syllable boundary, and that spelling goes to espeak-ng: the
voice gets the sounds it knows, and the pronunciation compare gets the same sounds.

Rules, in the order they apply between a syllable's final and the next one's initial (inside a word):
  ㅎ: ㅎ + ㄱ/ㄷ/ㅈ → ㅋ/ㅌ/ㅊ (좋다 조타), ㄱ/ㄷ/ㅂ/ㅈ + ㅎ → ㅋ/ㅌ/ㅍ/ㅊ (축하 추카), ㅎ before a vowel drops (좋아 조아)
  palatalisation: ㄷ/ㅌ + 이 → 지/치 (같이 가치)        liaison: a final moves onto a following vowel (읽어 일거)
  nasalisation: ㄱ/ㄷ/ㅂ (as said) + ㄴ/ㅁ → ㅇ/ㄴ/ㅁ (먹는 멍는, 합니다 함니다); ㅁ/ㅇ + ㄹ → ㄴ
  liquidisation: ㄴ + ㄹ, ㄹ + ㄴ → ㄹㄹ (신라 실라)     tensing: ㄱ/ㄷ/ㅂ (as said) + ㄱ/ㄷ/ㅂ/ㅅ/ㅈ → ㄲ/ㄸ/ㅃ/ㅆ/ㅉ (학교 학꾜)

  python3 tools/ko_sounds.py "같이 먹어요"          # pronounced hangul and espeak-ng IPA
"""
import os, re, subprocess, sys

INITIALS = 'ㄱㄲㄴㄷㄸㄹㅁㅂㅃㅅㅆㅇㅈㅉㅊㅋㅌㅍㅎ'
FINALS = ['', 'ㄱ', 'ㄲ', 'ㄳ', 'ㄴ', 'ㄵ', 'ㄶ', 'ㄷ', 'ㄹ', 'ㄺ', 'ㄻ', 'ㄼ', 'ㄽ', 'ㄾ', 'ㄿ', 'ㅀ', 'ㅁ', 'ㅂ', 'ㅄ', 'ㅅ', 'ㅆ',
          'ㅇ', 'ㅈ', 'ㅊ', 'ㅋ', 'ㅌ', 'ㅍ', 'ㅎ']
I_VOWEL = 'ㅇ'
# a double final: (the part that stays, the part that moves onto a vowel)
SPLIT = {'ㄳ': ('ㄱ', 'ㅅ'), 'ㄵ': ('ㄴ', 'ㅈ'), 'ㄶ': ('ㄴ', 'ㅎ'), 'ㄺ': ('ㄹ', 'ㄱ'), 'ㄻ': ('ㄹ', 'ㅁ'), 'ㄼ': ('ㄹ', 'ㅂ'),
         'ㄽ': ('ㄹ', 'ㅅ'), 'ㄾ': ('ㄹ', 'ㅌ'), 'ㄿ': ('ㄹ', 'ㅍ'), 'ㅀ': ('ㄹ', 'ㅎ'), 'ㅄ': ('ㅂ', 'ㅅ')}
# how a final sounds before a consonant (the seven final sounds)
SAID = {**{f: 'ㄱ' for f in 'ㄱㄲㅋㄳㄺ'}, **{f: 'ㄷ' for f in 'ㄷㅅㅆㅈㅊㅌㅎ'}, **{f: 'ㅂ' for f in 'ㅂㅍㅄㄿ'},
        'ㄵ': 'ㄴ', 'ㄶ': 'ㄴ', 'ㄼ': 'ㄹ', 'ㄽ': 'ㄹ', 'ㄾ': 'ㄹ', 'ㅀ': 'ㄹ', 'ㄻ': 'ㅁ'}
ASPIRATE = {'ㄱ': 'ㅋ', 'ㄷ': 'ㅌ', 'ㅂ': 'ㅍ', 'ㅈ': 'ㅊ'}
TENSE = {'ㄱ': 'ㄲ', 'ㄷ': 'ㄸ', 'ㅂ': 'ㅃ', 'ㅅ': 'ㅆ', 'ㅈ': 'ㅉ'}
NASAL = {'ㄱ': 'ㅇ', 'ㄷ': 'ㄴ', 'ㅂ': 'ㅁ'}
I_VOWEL_SOUND = 'ㅣ'   # 이 / 히 for palatalisation


def split(ch):
    n = ord(ch) - 0xAC00
    if not 0 <= n < 11172:
        return None
    return [INITIALS[n // 588], n % 588 // 28, FINALS[n % 28]]


def join(i, v, f):
    return chr(0xAC00 + INITIALS.index(i) * 588 + v * 28 + FINALS.index(f))


def _word(word):
    s = [split(c) for c in word]
    for k in range(len(s) - 1):
        a, b = s[k], s[k + 1]
        f, i = a[2], b[0]
        if not f:
            continue
        # ㅎ rules
        if f in ('ㅎ', 'ㄶ', 'ㅀ') and i in ASPIRATE:
            a[2] = {'ㅎ': '', 'ㄶ': 'ㄴ', 'ㅀ': 'ㄹ'}[f]; b[0] = ASPIRATE[i]; continue
        if f in ('ㅎ', 'ㄶ', 'ㅀ') and i == I_VOWEL:
            a[2] = {'ㅎ': '', 'ㄶ': '', 'ㅀ': ''}[f]
            if f != 'ㅎ': b[0] = SPLIT[f][0]
            continue
        if f == 'ㅎ' and i == 'ㄴ':
            a[2] = 'ㄴ'; continue
        if i == 'ㅎ' and SAID.get(f) in ASPIRATE and f not in ('ㄶ', 'ㅀ'):
            keep, move = SPLIT.get(f, ('', f))
            a[2] = keep; b[0] = ASPIRATE[SAID[move] if move in SAID else move]; continue
        # palatalisation and liaison onto a vowel
        if i == I_VOWEL:
            keep, move = SPLIT.get(f, ('', f))
            if move == 'ㅇ':
                continue
            if move in ('ㄷ', 'ㅌ') and b[1] == 20:          # 이
                move = 'ㅈ' if move == 'ㄷ' else 'ㅊ'
            a[2], b[0] = keep, move
            if keep and SAID.get(keep, keep) in TENSE and move in TENSE:     # 없어 → 업써
                b[0] = TENSE[move]
            continue
        if f == 'ㄺ' and i == 'ㄱ':                          # 읽고 일꼬, 맑게 말께
            a[2] = 'ㄹ'; b[0] = 'ㄲ'; continue
        said = SAID.get(f, f)
        if said in NASAL and i in ('ㄴ', 'ㅁ'):
            a[2] = NASAL[said]; continue
        if f in ('ㅁ', 'ㅇ') and i == 'ㄹ':
            b[0] = 'ㄴ'; continue
        if (f == 'ㄴ' and i == 'ㄹ') or (said == 'ㄹ' and i == 'ㄴ'):
            a[2] = 'ㄹ' if f == 'ㄴ' else a[2]; b[0] = 'ㄹ'; continue
        if said in TENSE and said in ('ㄱ', 'ㄷ', 'ㅂ') and i in TENSE:
            b[0] = TENSE[i]
    return ''.join(join(*x) for x in s)


def pronounced(text):
    """the text in pronounced hangul; anything that is not a run of hangul syllables stays as it is"""
    return re.sub(r'[가-힣]+', lambda m: _word(m.group(0)), text or '')


VOWELS = 'aeiouɐʌɯɛəɔøyɪʊ'


def compare_ipa(ph):
    """espeak-ng's Korean symbols in standard IPA, for the pronunciation compare (the voice keeps espeak's own): q is the
    plain ㄱ — [ɡ] between voiced sounds (vowels, ㄴ ㄹ ㅁ ㅇ) and a vowel, [k] elsewhere; h after a stop is aspiration; - (tense) goes; ɐ → a, ɫ → l"""
    s = ph.replace('-', '')
    s = re.sub(r'(tʃ|tɕ|ts|p|t|k|q)h', lambda m: m.group(1) + 'ʰ', s)
    out = []
    for k, ch in enumerate(s):
        if ch == 'q':
            prev = next((c for c in reversed(s[:k]) if c not in 'ˈˌ'), '')
            nxt = next((c for c in s[k + 1:] if c not in 'ˈˌ'), '')
            ch = 'ɡ' if prev and prev in VOWELS + 'lɫnmŋ' and nxt and nxt in VOWELS else 'k'   # voiced between voiced sounds
        out.append(ch)
    return ''.join(out).replace('ɐ', 'a').replace('ɫ', 'l')


QUIET = {**os.environ, 'PULSE_SERVER': '/nonexistent'}    # espeak-ng would connect to the sound server (2026-10-27)


def phonemes(text):
    """espeak-ng's Korean IPA of the pronounced text — the sounds the kss voice was trained on"""
    out = subprocess.run(['espeak-ng', '-q', '--ipa', '-v', 'ko', '--stdin'], input=(pronounced(text) + '\n').encode(),
                         capture_output=True, env=QUIET).stdout.decode('utf-8', 'replace')
    return ' '.join(out.split())


if __name__ == '__main__':
    for t in sys.argv[1:]:
        print(t, '→', pronounced(t), '→', phonemes(t))
