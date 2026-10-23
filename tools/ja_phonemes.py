#!/usr/bin/env python3
"""Japanese text → the sounds the natural Piper voice reads (ja_JP-hi_fi_captain, phoneme_type "japanese").

That voice was trained on OpenJTalk phones with pitch accent, written in IPA plus prosody marks: ↑ rise (mora 1 → 2
of an accent phrase), ↓ fall (after the accent nucleus), # accent-phrase boundary, «,» pause, «.» / «?» sentence end.
The accent marks follow the prosody scheme of ESPnet's pyopenjtalk_g2p_prosody (Apache-2.0), with the symbols the
voice's phoneme map knows. The browser has no OpenJTalk, so the build computes the sounds of every course string
once (Allan, 2026-10-22: the natural Japanese voice needs this step) and the course carries them.

Our authored reading is the reference: OpenJTalk reads the kanji text (better accent) only when it reads it the same
as our kana; otherwise it reads our kana.

Needs pyopenjtalk (BSD-3; dictionary from Open JTalk, modified BSD):
    uvx --with pyyaml --with pyopenjtalk python3 tools/build_conversation.py
"""
from __future__ import annotations

import re

import pyopenjtalk

IPA = {
    'a': 'a', 'i': 'i', 'u': 'ɯ', 'e': 'e', 'o': 'o',
    'k': 'k', 'ky': 'kʲ', 'kw': 'kʷ', 'g': 'ɡ', 'gy': 'ɡʲ', 'gw': 'ɡʷ', 's': 's', 'sh': 'ɕ', 'z': 'z', 'j': 'dʑ',
    't': 't', 'ts': 'ts', 'ty': 'tʲ', 'ch': 'tɕ', 'd': 'd', 'dy': 'dʲ', 'n': 'n', 'ny': 'nʲ', 'h': 'h', 'hy': 'hʲ',
    'f': 'ɸ', 'b': 'b', 'by': 'bʲ', 'p': 'p', 'py': 'pʲ', 'm': 'm', 'my': 'mʲ', 'y': 'j', 'r': 'ɾ', 'ry': 'ɾʲ',
    'w': 'w', 'v': 'v', 'N': 'ɴ', 'cl': 'ʔ',
}
RISE, FALL, BOUNDARY, PAUSE, END, QUESTION = '↑', '↓', '#', ',', '.', '?'
ACCENT = (RISE, FALL, BOUNDARY, PAUSE, END, QUESTION)
MORA_END = {'a', 'i', 'u', 'e', 'o', 'N', 'cl'}
SENTENCE = re.compile(r'[^。．！？!?]+[。．！？!?]*[」』）】”’"\')\]]*')
PHONE = re.compile(r'-(.*?)\+')


def _num(pattern, label):
    m = re.search(pattern, label)
    try:
        return int(m.group(1)) if m else -50
    except ValueError:                      # unset fields are "xx"
        return -50


def _sentence(s):
    labels = pyopenjtalk.make_label(pyopenjtalk.run_frontend(s))
    out = []
    for n, lab in enumerate(labels):
        m = PHONE.search(lab)
        if not m:
            continue
        p = m.group(1)
        if p in 'AIUEO':                    # devoiced vowels: their voiced form; devoicing follows from context
            p = p.lower()
        if p == 'sil':
            if n == len(labels) - 1:
                out.append(QUESTION if _num(r'!(\d+)_', lab) == 1 else END)
            continue
        if p == 'pau':
            out.append(PAUSE)
            continue
        out.append(IPA[p])
        if n >= len(labels) - 1:
            continue
        a1, a2, a3 = _num(r'/A:([0-9\-]+)\+', lab), _num(r'\+(\d+)\+', lab), _num(r'\+(\d+)/', lab)
        f1, a2_next = _num(r'/F:(\d+)_', lab), _num(r'\+(\d+)\+', labels[n + 1])
        if a3 == 1 and a2_next == 1 and p in MORA_END:
            out.append(BOUNDARY)
        elif a1 == 0 and a2_next == a2 + 1 and a2 != f1:
            out.append(FALL)
        elif a2 == 1 and a2_next == 2:
            out.append(RISE)
    return ''.join(out)


def _sounds(text):
    out = []
    for s in SENTENCE.findall(text.replace(' ', '')):
        s = s.strip()
        if s:                                  # «…か。» is a question: OpenJTalk only hears one in «？»
            out.append(_sentence(re.sub(r'か[。．]?$', 'か？', s)))
    return ''.join(out)


def _plain(ph):
    # えい and おう in kana are the long vowels ee and oo that OpenJTalk says for the kanji (学生 がくせい = gakusee)
    return ''.join(c for c in ph if c not in ACCENT).replace('ei', 'ee').replace('oɯ', 'oo')


def phonemes(text: str, reading: str) -> str:
    """the voice's symbols for `text`, read as `reading` (our kana)"""
    by_kana = _sounds(reading)
    by_text = _sounds(text)
    return by_text if _plain(by_text) == _plain(by_kana) else by_kana
