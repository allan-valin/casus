#!/usr/bin/env python3
"""Spike (Allan 2026-10-28): Conversation voices made with OmniVoice (Apache-2.0 code, CC BY-NC weights) instead of one
pitched Piper voice. Each character's voice is DESIGNED from attributes (no real person's recording), once, from a short
reference sentence; every line is then cloned from that designed clip, so a character keeps one voice.

    python3 tools/talk_audio/omnivoice_spike.py ar A1-01 A1-02 --out <dir>
"""
import argparse
import json
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
            "protagonist-m": "male, young adult, moderate pitch",
            "officer": "male, middle-aged, low pitch",
            "sami": "male, teenager, high pitch",
            "driver": "male, elderly, low pitch",
            "huda": "female, middle-aged, moderate pitch",
            "khalid": "male, middle-aged, moderate pitch",
        },
    },
}


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("code")
    ap.add_argument("units", nargs="+")
    ap.add_argument("--out", type=Path, required=True)
    a = ap.parse_args()
    a.out.mkdir(parents=True, exist_ok=True)
    model = OmniVoice.from_pretrained("k2-fsa/OmniVoice", device_map="cuda:0", dtype=torch.float16)
    spec = DESIGN[a.code]
    refs = {}
    for who, attrs in spec["voices"].items():
        torch.manual_seed(7)
        wav = model.generate(text=spec["ref"], language=LANG.get(a.code, a.code), instruct=attrs)[0]
        p = a.out / f"ref-{who}.wav"
        sf.write(p, wav, SR)
        refs[who] = model.create_voice_clone_prompt(ref_audio=str(p), ref_text=spec["ref"])
    for uid in a.units:
        unit = yaml.safe_load((ROOT / "tools/conversation" / a.code / f"{uid}.yml").read_text(encoding="utf-8"))
        lines = next(s["lines"] for s in unit["steps"] if s["type"] == "dialogue" and "lines" in s)
        parts = []
        for n, ln in enumerate(lines):
            who = f"protagonist-{unit['protagonist']}" if ln["speaker"] == "protagonist" else ln["speaker"]
            for tries in range(3):     # an empty clip happened once (2026-10-28): try again with another seed
                torch.manual_seed(11 + tries)
                wav = model.generate(text=ln["text"], language=LANG.get(a.code, a.code), voice_clone_prompt=refs[who])[0]
                if len(wav) > SR * 0.3:
                    break
            sf.write(a.out / f"{uid}-{n:02d}-{who}.wav", wav, SR)
            parts += [wav, np.zeros(int(SR * 0.5), dtype=wav.dtype)]
        sf.write(a.out / f"{uid}-dialogue.wav", np.concatenate(parts), SR)
        print(uid, len(lines), "lines", flush=True)
    print(json.dumps({"out": str(a.out)}))


if __name__ == "__main__":
    main()
