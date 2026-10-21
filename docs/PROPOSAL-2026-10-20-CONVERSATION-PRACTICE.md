# Proposal: Conversation practice tab (Allan, 2026-10-20)

Status: **decided 2026-10-21 (Allan's answers below)**; proposal text kept above them — wishlist item, built only after the translation pairs he listed
(de→mk, de→ar first, then the rest; docs/PLAN-2026-10-20-TRANSLATE-IMPORTED.md). Nothing here is built yet.

## What Allan asked for
A "Conversation practice" tab in every language, in the spirit of the Pimsleur method but **not a copy** of it
(Pimsleur is copyrighted: we take the principles, never its scripts, recordings or booklets):

- a **narrator in the interface language** and **characters in the taught language**, each with its own Piper voice;
- instead of 30-minute audio files full of pauses, an **ordered list of steps**, each with a ▶ button and the
  narrator's explanation; the taught-language text is **hidden until clicked** (click again to hide), so a step can be
  played as often as needed;
- **spaced repetition**: earlier material comes back in later units, woven into the dialogues;
- **CEFR as the content frame**, one unit per Learn lesson topic, and **a story** instead of tourist phrases:
  - **A** — you have just moved to the country: settling in, daily problems, the quirks of daily life (in Germany
    shops are closed on Sundays, Mülltrennung, Anmeldung…), the culturally significant things one notices on arrival;
  - **B** — making friends, general topics, finding a job, the interview, business meetings;
  - **C** — university life, but as *conversation about* school-level science and ideas: biology, chemistry, physics,
    maths, philosophy at middle/high-school level (Allan: C1 German, yet never learned these words and switches to
    English when they come up);
- **unit length** like Allan's Macedonian adaptation (docx: about 15–30 new items introduced with their meaning, then
  one 8–10-line dialogue per unit);
- heavy research and creative work → **Allan involved in content and decisions up front** (correcting later costs
  several times more).

## The method, in our terms (from the Pimsleur Owner's Manual, principles only)
| Principle | What it means here |
|---|---|
| Anticipation | a step asks ("How would you say: *I don't understand*?"), you answer out loud, then reveal/play the answer |
| Graduated interval recall | each item is scheduled to return 1, 2, 4, 8… units later, as a prompt or inside a dialogue |
| Core vocabulary | function words and high-frequency structures first; content words from the story's situation |
| Organic learning | sound first (text hidden by default), grammar never lectured, met in use |
| Dialogue in situation | every unit opens with the scene's dialogue (heard, not understood), ends with it understood |
| 80 % rule | the unit ends with a self-check: "got about 4 in 5? go on"; progress saved like Learn's |

## A unit, concretely (a draft shape to react to)
```
Unit A1·03 — "Anmeldung: the registration office"           (German, narrator in Portuguese)
 1 ▶ narrator   "Você acabou de chegar à Alemanha. Primeiro, a prefeitura. Escute."
 2 ▶ dialogue   (two voices, ~8 lines)                      [show text ▾]
 3 ▶ narrator   "Como se diz 'com licença'? Escute e repita."
 4 ▶ Lena       Entschuldigung.                             [show ▾] Entschuldigung · com licença
 5 ▶ narrator   "Agora pergunte se ela fala inglês."  … pause …  ▶ answer  [show ▾]
 …  (15–30 new items; 6–10 review items from units 01–02, scheduled)
 n ▶ dialogue again — now you understand it                  [show text ▾]
   ✓ self-check (80 %)   📖 words open their dictionary entry   🎤 say it in the Pronunciation trainer
```
Every step: ▶ play · reveal/hide text (taught language + transliteration where useful + meaning in the UI
language) · links to the dictionary entry and the pronunciation trainer, which already exist.

## Story bible (draft, to be decided with Allan)
One protagonist (the learner, "você/you/du"), a small recurring cast per country (landlord, neighbour, colleague,
friend, teacher), each with a fixed voice. The same arc in every language, **adapted** to the country — not
translated: different institutions, food, holidays, manners, humour.

| Level | Arc (≈ units) | Examples of situations |
|---|---|---|
| A1 | arrival, first week (≈20) | greetings, registration office, SIM card, supermarket, Sunday closures, asking the way |
| A2 | settling in (≈20) | flat viewing, bank account, doctor, bins and rules, neighbours, public transport, small repairs |
| B1 | social life (≈20) | making friends, plans, opinions, hobbies, a party, a misunderstanding |
| B2 | work (≈20) | job ads, CV, interview, first day, meetings, e-mail register, conflict |
| C1 | university, sciences (≈20) | biology, chemistry, physics, maths explained in talk: lab, lecture, study group |
| C2 | ideas (≈20) | philosophy, debate, abstract argument, humour, register shifts |

Content reference per level: the CEFR descriptors and our Learn curricula's lesson topics (each unit names the Learn
lessons it practises, and Learn lessons link back to it).

## Audio
- **Piper** voices (open licences only, as everywhere in Casus). Needed per language: ≥2 distinguishable character
  voices (male/female or different speakers) and narrator voices for en/pt/de/mk/ar.
- Two ways to deliver, to decide: (a) synthesized **in the browser** on demand (no storage, slower first play, works
  only where the Piper model downloads); (b) **pre-rendered** clips, small Opus files per step, cached (instant, costs
  storage: roughly 20 units × 6 levels × ~60 clips ≈ 7 000 clips per language per narrator language).
- Voice gaps must be audited first (not every Casus language has an open Piper voice, let alone two; classical
  languages have none). Licences checked per voice — no NC.

## Authoring pipeline
1. **Story bible** + cast + country notes per language — Allan reviews.
2. **Unit plans** per level: situation, functions, new items, review schedule, linked Learn lessons — Allan reviews A1.
3. **Scripts written in the taught language** by Claude from the plan (not translated from English), with research
   per country (open sources), then narrator text in each interface language.
4. **Checks**: grammar/meaning by Claude, a native check list for what needs a human (Macedonian especially — the
   docx draft has slips like *ne mnogo* for *ne mnogu*, Serbo-Croatian *gospođica* for *госпоѓица*).
5. Data files `tools/conversation/<code>/<level>/<unit>.yml` (steps, items introduced, reviews, cast) → built into
   the site like Learn; tests for schedule coverage (every item returns on time), voices assigned, texts present.

## Scale (honest)
≈120 units per language at full C2; Allan's priority languages first. A first useful slice — **German A1, narrator
in Portuguese and English, ~20 units** — is a few sessions of writing plus his review; each further level and
language adds similar effort. This runs over days and weeks, alongside his review, not in one go.

## Phases
- **P0 — decisions** (this document's questions) and voice audit.
- **P1 — prototype**: the tab, the step list, reveal/hide, play, review schedule; 3 German A1 units; Allan tests.
- **P2 — German A1** complete; then the next language/level Allan picks.
- **P3+** — further levels and languages; interface languages for the narrator.

## Questions for Allan (the ones that change what gets built)
1. First language and narrator language for the prototype: German with a Portuguese narrator? (or Macedonian, since
   no course exists for it)
2. Which country per language where there are several: Germany/Austria/Switzerland, Brazil/Portugal, Spain/Mexico…,
   Arabic: MSA or a dialect (Egyptian, Levantine)?
3. Classical languages (Latin, Ancient Greek, Sanskrit): left out, or a different, non-travel story?
4. Prompts: spoken answers only (Pimsleur style), or also an optional "type your answer"?
5. Audio delivery: in-browser Piper, or pre-rendered clips?
6. The protagonist: a neutral "you", or a named character (gender affects verb forms in many languages — choose per
   learner?).
7. How much review per unit (Pimsleur leans heavy): ~30 % old material?
8. Link to the pronunciation trainer from every phrase — yes?

## Allan's decisions (2026-10-21)
- **Order (taught language · narrator)**: mk · pt-BR first, then de · mk, ko · pt-BR, de · ar, ja · pt-BR, and so on.
  (German was only his own moving-in example, not the starting point; de · pt/en are not a priority.)
- **Formality**: research per language how polite/informal forms are expected — formal with strangers and in formal
  situations, informal with friends/colleagues, varying by country (in Brazil the polite form is rare). No fixed "du".
- **Culture shock research per language** (Sunday closures are only Germany): what surprises newcomers in each country,
  **and the narrator language's culture** too, so scenarios arise where the two differ and confusion happens.
- **CEFR** is the frame; adapt topics where something else fits the difficulty better.
- **Read the Pimsleur PDFs** (reading booklets, course books) of the relevant languages for structure — never copy.
- **Audio in the browser** (Piper; short clips are fast enough). Voice gaps: alter pitch to make another character, or
  use a sister language's voice. No Piper voice at all → the language is left out (classical languages included).
- **Dialects**: always the standard taught in grammars; the country matching the language's name (pt-BR: Brazil).
  Optionally one chapter introducing the main dialect differences, only where a TTS voice exists for them.
- **Prompts**: spoken answers, plus an optional typed answer.
- **Protagonist**: matches the available voices; if both genders exist, alternate who does what, so all verb forms are
  practised.
- **Review ≈ 25 %**, varied: similar situation and response in a new setting that fits the story (lesson 1 greets in
  the supermarket, lesson 2 greets somewhere else), never the same lines repeated.
- **Pronunciation-trainer link on every phrase**: yes. Pipeline: as proposed.
- **Effort**: it is text that gets synthesized; a unit script takes minutes to review. The real time goes into
  agreeing on the material — so the story bible, culture notes and unit plans come to Allan first.

## Voice audit (2026-10-21, Piper model cards)
- **Open (CC0 / CC BY)**: pt_BR cadu, faber, jeff (CC0), edresson (CC BY); bg_BG dimitar (CC0); uk_UA ukrainian_tts
  (3 speakers, CC0); de thorsten etc.
- **NC — excluded by the open-licence rule**: ko_KR kss (CC BY-NC-SA), ja_JP hi_fi_captain (CC BY-NC-SA), sr_RS
  serbski_institut (CC BY-NC-SA); MMS-TTS (all languages, CC BY-NC). ar_JO kareem: licence "see URL", unverified.
- **Macedonian**: no voice; proposal = Bulgarian dimitar fed Macedonian phonemes (spikes/mk-voice-2026-10-21/).
- **Consequence for the order**: ko · pt-BR and ja · pt-BR have no open Piper character voice. Options for Allan:
  the reader's own browser/OS voice (speechSynthesis — Android and Windows ship ko and ja voices; nothing is
  distributed by Casus), or leave them out per the "no voice → left out" rule.
