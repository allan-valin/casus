# Korean TOPIK 3 — under construction, incomplete

Units B1-01…10 (TOPIK 3) are written but not proofread (Hunspell ko + LanguageTool pt) and not shipped. They live here so
`tools/build_conversation.py` (which reads `ko/[ABC][12]-*.yml`) does not publish them. Parked by Allan 2026-10-28.
To resume: proofread, move back to `ko/`, build; then write 11…30. Do NOT run `tools/expand_unit.py ko` before that:
it would write the expanded units back into `ko/` from `src/`.
