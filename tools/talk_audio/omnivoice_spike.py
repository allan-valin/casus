#!/usr/bin/env python3
"""Spike (Allan 2026-10-28): Conversation voices made with OmniVoice (Apache-2.0 code, CC BY-NC weights) instead of one
pitched Piper voice. Each character's voice is DESIGNED from attributes (no real person's recording), once, from a short
reference sentence; every line is then cloned from that designed clip, so a character keeps one voice.

    python3 tools/talk_audio/omnivoice_spike.py ar A1-01 A1-02 --out <dir>
"""
import argparse
import difflib
import json
import re
from pathlib import Path

import numpy as np
import soundfile as sf
import torch
import yaml
from omnivoice import OmniVoice

ROOT = Path(__file__).resolve().parents[2]
SR = 24000
LANG = {"ar": "arb"}   # OmniVoice ids: Modern Standard Arabic is arb (ar is not recognised)
# designed voices: attributes only (OmniVoice voice design); the reference sentence is spoken once in that voice
DESIGN = {
    "ar": {
        "ref": "مَرْحَبًا، كَيْفَ حالُكَ؟ أَنا مِنْ عَمّانَ، وَهٰذا بَيْتي.",
        "voices": {
            "protagonist-f": "female, young adult, moderate pitch",
            # Allan 2026-10-28: "teenager" and "elderly" gave breathing, not speech; the male protagonist sounded too young
            "protagonist-m": "male, young adult, low pitch",
            "officer": "male, middle-aged, low pitch",
            "sami": "male, young adult, high pitch",
            "driver": "male, middle-aged, very low pitch",
            "huda": "female, middle-aged, moderate pitch",
            "khalid": "male, middle-aged, moderate pitch",
        },
    },
}


# Allan 2026-10-28: a line with two sentences came out in one breath — the model runs punctuation together. Each piece
# up to a full stop, comma, question or exclamation mark is spoken alone; pauses are put back by us.
PIECE = re.compile(r"[^.،,؟?!]+[.،,؟?!]*")
PAUSE = {"،": 0.22, ",": 0.22}            # after a comma; anything else (. ? !) 0.45 s
MARKS = re.compile(r"[\u064B-\u0652\u0670\u0640.،,؟?!:\"“”«»\s]")


def bare(t):
    """letters only: Whisper writes no vowel marks, so they are left out of the comparison"""
    return MARKS.sub("", t)


def error(model, wav, text):
    """share of letters Whisper heard differently (0 = exactly the text; breathing alone ≈ 1)"""
    # Whisper told the language: one word alone was heard as Turkish ("Şokran") or English ("I've won" for عفوا)
    heard = model._asr_pipe({"raw": wav.astype(np.float32), "sampling_rate": SR},
                            generate_kwargs={"language": "arabic", "task": "transcribe"})["text"].strip()
    return 1 - difflib.SequenceMatcher(None, bare(text), bare(heard)).ratio(), heard


def trim(wav):
    """cut breath and silence before the first and after the last loud stretch (Allan: "inhales before speaking")"""
    frame = SR // 100
    rms = np.array([np.sqrt(np.mean(wav[i:i + frame] ** 2)) for i in range(0, len(wav) - frame, frame)])
    if not len(rms):
        return wav
    loud = np.where(rms > 0.25 * rms.max())[0]
    a, b = max(0, loud[0] - 3) * frame, min(len(wav), (loud[-1] + 6) * frame)
    return wav[a:b]


def best(model, text, tries, **kw):
    """the take with the fewest misheard letters out of a few seeds"""
    takes = []
    for n in range(tries):
        torch.manual_seed(11 + n)
        wav = trim(model.generate(text=text, **kw)[0])
        err, heard = error(model, wav, text)
        takes.append((err, n, wav, heard))
        if err < 0.08:
            break
    return min(takes, key=lambda x: x[0])


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("code")
    ap.add_argument("units", nargs="+")
    ap.add_argument("--out", type=Path, required=True)
    a = ap.parse_args()
    a.out.mkdir(parents=True, exist_ok=True)
    model = OmniVoice.from_pretrained("k2-fsa/OmniVoice", device_map="cuda:0", dtype=torch.float16)
    model.load_asr_model()      # Whisper large-v3-turbo (MIT): checks every take, since nobody here reads Arabic
    spec = DESIGN[a.code]
    lang = LANG.get(a.code, a.code)
    refs, report = {}, {}
    for who, attrs in spec["voices"].items():
        err, seed, wav, heard = best(model, spec["ref"], 5, language=lang, instruct=attrs)
        p = a.out / f"ref-{who}.wav"
        sf.write(p, wav, SR)
        report[f"ref-{who}"] = {"error": round(err, 2), "heard": heard}
        refs[who] = model.create_voice_clone_prompt(ref_audio=str(p), ref_text=spec["ref"])
    for uid in a.units:
        unit = yaml.safe_load((ROOT / "tools/conversation" / a.code / f"{uid}.yml").read_text(encoding="utf-8"))
        lines = next(s["lines"] for s in unit["steps"] if s["type"] == "dialogue" and "lines" in s)
        parts = []
        for n, ln in enumerate(lines):
            who = f"protagonist-{unit['protagonist']}" if ln["speaker"] == "protagonist" else ln["speaker"]
            line = []
            for piece in PIECE.findall(ln["text"]):
                if not bare(piece):
                    continue
                err, seed, wav, heard = best(model, piece.strip(), 3, language=lang, voice_clone_prompt=refs[who])
                report[f"{uid}-{n:02d}: {piece.strip()}"] = {"error": round(err, 2), "heard": heard}
                line += [wav, np.zeros(int(SR * PAUSE.get(piece.strip()[-1], 0.45)), dtype=wav.dtype)]
            out = np.concatenate(line[:-1])
            sf.write(a.out / f"{uid}-{n:02d}-{who}.wav", out, SR)
            parts += [out, np.zeros(int(SR * 0.6), dtype=out.dtype)]
        sf.write(a.out / f"{uid}-dialogue.wav", np.concatenate(parts), SR)
        print(uid, len(lines), "lines", flush=True)
    (a.out / "report.json").write_text(json.dumps(report, ensure_ascii=False, indent=1), encoding="utf-8")
    print(json.dumps({"out": str(a.out)}))


if __name__ == "__main__":
    main()
