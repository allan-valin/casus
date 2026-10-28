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
            # Allan 17:55: everyone middle-aged (over 30) unless the story has a child; "young adult" still sounded teen
            "protagonist-m": "male, middle-aged, moderate pitch",
            "officer": "male, middle-aged, low pitch",
            "sami": "male, middle-aged, high pitch",
            "driver": "male, middle-aged, very low pitch",
            "huda": "female, middle-aged, moderate pitch",
            "khalid": "male, middle-aged, moderate pitch",
        },
    },
}


# Allan 2026-10-28: a line with two sentences came out in one breath — the model runs punctuation together. Each piece
# up to a full stop, comma, question or exclamation mark is spoken alone; pauses are put back by us.
# Allan 17:55: joins at commas gave an "i" sound and clicks → split only at sentence ends; commas stay with the model
PIECE = re.compile(r"[^.؟?!]+[.؟?!]*")
PAUSE = {}                                 # 0.45 s after a sentence
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
    # the start: from the first loud stretch (breath is quieter); the end: down to a much quieter level and a longer tail,
    # so the last sound fades out instead of being cut (Allan 17:55: "ending kind of abruptly")
    start = np.where(rms > 0.25 * rms.max())[0][0]
    end = np.where(rms > 0.03 * rms.max())[0][-1]
    a, b = max(0, start - 5) * frame, min(len(wav), (end + 15) * frame)
    out = wav[a:b].copy()
    fi, fo = min(len(out), int(SR * 0.012)), min(len(out), int(SR * 0.06))
    out[:fi] *= np.linspace(0, 1, fi)          # no click at the joins
    out[len(out) - fo:] *= np.linspace(1, 0, fo)
    return out


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
    ap.add_argument("--candidates", type=int, default=3)
    ap.add_argument("--pick", nargs="*", default=[], help="who=k: use candidate k of a voice")
    ap.add_argument("--reuse", type=Path, help="a run whose ref-<who>-<k>.wav files are kept for the picked voices")
    ap.add_argument("--first", type=int, default=1, help="number of the first new candidate (new seeds)")
    ap.add_argument("--voice", nargs="*", default=[], help='who="attributes": override a designed voice')
    a = ap.parse_args()
    a.out.mkdir(parents=True, exist_ok=True)
    model = OmniVoice.from_pretrained("k2-fsa/OmniVoice", device_map="cuda:0", dtype=torch.float16)
    model.load_asr_model()      # Whisper large-v3-turbo (MIT): checks every take, since nobody here reads Arabic
    spec = DESIGN[a.code]
    lang = LANG.get(a.code, a.code)
    refs, report = {}, {}
    picks = dict(x.split("=") for x in a.pick)
    voices = {**spec["voices"], **dict(x.split("=", 1) for x in a.voice)}
    for who, attrs in voices.items():
        if a.reuse and who in picks:          # Allan picked it by ear: the very same file, not a regenerated one
            p = a.out / f"ref-{who}-{picks[who]}.wav"
            p.write_bytes((a.reuse / p.name).read_bytes())
            report[f"use-{who}"] = int(picks[who])
            refs[who] = model.create_voice_clone_prompt(ref_audio=str(p), ref_text=spec["ref"])
            continue
        # candidates for Allan's ear (Allan 17:55: pick the voice by number, no Arabic needed)
        cands = []
        for k in range(a.first, a.first + a.candidates):
            torch.manual_seed(100 * k)
            wav = trim(model.generate(text=spec["ref"], language=lang, instruct=attrs)[0])
            err, heard = error(model, wav, spec["ref"])
            p = a.out / f"ref-{who}-{k}.wav"
            sf.write(p, wav, SR)
            report[f"ref-{who}-{k}"] = {"error": round(err, 2), "heard": heard}
            cands.append((err, k, p))
        k = int(picks[who]) if who in picks else min(cands)[1]
        p = a.out / f"ref-{who}-{k}.wav"
        report[f"use-{who}"] = k
        refs[who] = model.create_voice_clone_prompt(ref_audio=str(p), ref_text=spec["ref"])
    for uid in a.units:
        unit = yaml.safe_load((ROOT / "tools/conversation" / a.code / f"{uid}.yml").read_text(encoding="utf-8"))
        lines = next(s["lines"] for s in unit["steps"] if s["type"] == "dialogue" and "lines" in s)
        parts = []
        for n, ln in enumerate(lines):
            who = f"protagonist-{unit['protagonist']}" if ln["speaker"] == "protagonist" else ln["speaker"]
            line = []
            pieces = []
            for piece in PIECE.findall(ln["text"]):
                # a one-word sentence alone came out as noise (كَمْ؟ 2026-10-28): it stays with the one before
                if pieces and len(piece.split()) < 2:
                    pieces[-1] += piece
                else:
                    pieces.append(piece)
            for piece in pieces:
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
