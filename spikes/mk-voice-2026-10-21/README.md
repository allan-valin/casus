# Macedonian through the Bulgarian Piper voice (2026-10-21)

No Macedonian TTS voice exists: Meta MMS has none (facebook/mms-tts-mkd does not exist; checked again 2026-10-21), and
Piper has none (closest: sr_RS-serbski_institut, CC BY-NC — allowed, Casus is not sold).
`bg_BG-dimitar-medium` is CC0. `phon.py` phonemizes Macedonian with espeak-ng's `mk` rules (antepenultimate stress,
no vowel reduction, ќ→kʲ, ѓ→ɡʲ, ѕ→dz, unstressed clitics) and maps the IPA to the Bulgarian model's phoneme ids;
`synth.mjs` runs the model with onnxruntime-node.

    python3 phon.py bg_BG-dimitar-medium.onnx out.json '["Добар ден."]'
    node synth.mjs bg_BG-dimitar-medium.onnx out.json prefix

Samples: mkbg-1..5.wav (male), mkbg-1..3-pitch.wav (pitch ×1.25, ffmpeg, as a female character). Texts in
mk-bg.json. Allan, 2026-10-21: the pitched voice (mkbg-1-pitch) for the woman, the plain one (mkbg-2) for the man — this approach
is the mk voice for the conversation units.
