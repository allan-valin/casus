# Conversation practice — guidelines

How to write Conversation practice for Casus: the technique, the writing rules, the story-bible template and the
unit template, so that anyone can write a course for a pair of languages. Same content in every interface language:

- English — [GUIDE.en.md](GUIDE.en.md)
- Português (Brasil) — [GUIDE.pt-BR.md](GUIDE.pt-BR.md)
- Deutsch — [GUIDE.de.md](GUIDE.de.md)
- Македонски — [GUIDE.mk.md](GUIDE.mk.md)
- العربية — [GUIDE.ar.md](GUIDE.ar.md)

Templates (filled in with a short German example): [`tools/conversation/_template/`](../../tools/conversation/_template/).
Checker: `python3 tools/conversation_check.py tools/conversation/<code>`.

Planned courses, in order (taught language · narrator): mk · pt-BR, de · mk, ko · pt-BR, de · ar, ja · pt-BR.

Courses (Allan's order: mk·pt-BR, de·mk, ko·pt-BR, de·ar, ja·pt-BR). Plans redone after Allan's review of
2026-10-21 (30 units per level, life/life/topic rhythm, a Reviewed column, the pace of the classic audio courses):
- mk · pt-BR — [PLAN-mk-pt-BR.md](PLAN-mk-pt-BR.md) (A1–C2, 180 units); units A1-01… in `tools/conversation/mk/`
- de · mk and de · ar — [PLAN-de-mk-ar.md](PLAN-de-mk-ar.md) (A1–C2, 180 units)
- ko · pt-BR — [PLAN-ko-pt-BR.md](PLAN-ko-pt-BR.md) (A1 in full, A2–C2 outlined)
- ja · pt-BR — [PLAN-ja-pt-BR.md](PLAN-ja-pt-BR.md) (A1 in full, A2–C2 outlined)

The Macedonian and Arabic versions were written by an AI and await a native speaker's reading.

Build for the site: `python3 tools/build_conversation.py` checks every course and writes `public/talk/<code>.json`,
which the Conversation tab (`/<code>/talk/`) reads. Until a language has its own course, the template's German
units appear on `/de/talk/` as an example.
