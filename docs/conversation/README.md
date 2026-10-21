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

Courses (Allan's order: mk·pt-BR, de·mk, ko·pt-BR, de·ar, ja·pt-BR):
- mk · pt-BR — bible + A1 plan ACCEPTED 2026-10-21, units A1-01… in `tools/conversation/mk/`;
  A2–C2 plan DRAFT: [PLAN-mk-pt-BR-A2-C2.md](PLAN-mk-pt-BR-A2-C2.md)
- de · mk and de · ar — bible + A1 plan ACCEPTED 2026-10-21 ([PLAN-de-mk-ar-A1.md](PLAN-de-mk-ar-A1.md));
  A2–C2 plan DRAFT: [PLAN-de-mk-ar-A2-C2.md](PLAN-de-mk-ar-A2-C2.md)
- ko · pt-BR — bible + A1 plan DRAFT: `tools/conversation/ko/story-bible.yml`, [PLAN-ko-pt-BR-A1.md](PLAN-ko-pt-BR-A1.md)
- ja · pt-BR — bible + A1 plan DRAFT: `tools/conversation/ja/story-bible.yml`, [PLAN-ja-pt-BR-A1.md](PLAN-ja-pt-BR-A1.md)
- ko · pt-BR and ja · pt-BR — on hold: the open Korean and Japanese Piper voices are NC (see the proposal's voice audit).

The Macedonian and Arabic versions were written by an AI and await a native speaker's reading.

Build for the site: `python3 tools/build_conversation.py` checks every course and writes `public/talk/<code>.json`,
which the Conversation tab (`/<code>/talk/`) reads. Until a language has its own course, the template's German
units appear on `/de/talk/` as an example.
