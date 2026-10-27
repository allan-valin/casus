# Conversation practice — a guide for writers

This guide is for anyone who wants to write Conversation practice for Casus: a course that teaches a language by
speaking, in short units, each one a scene of a story. With this guide, the two templates and the checker you can
write a whole course for any pair of languages (the language taught, and the language of the narrator who guides
the learner) without asking anyone. The same guide exists in English, Portuguese, German, Macedonian and Arabic.

The templates are in `tools/conversation/_template/`: `story-bible.yml` (the world of the course) and `A1-01.yml`,
`A1-02.yml` (two units). They are filled in with a short German example narrated in Portuguese and English; copy
them and replace the content.

## What the learner gets

A unit is a list of steps. Each step has a ▶ button. The **narrator** speaks the learner's language and guides; the
**characters** speak the taught language, each with their own voice. The taught-language text is hidden until the
learner clicks it (click again to hide it), because the ear comes first. A step can be played as often as needed.
Every phrase links to its dictionary entry and to the pronunciation trainer. The learner may also type an answer
instead of saying it.

A unit opens with a short dialogue the learner hears without understanding it yet, teaches its pieces one by one
through questions, and ends with the same dialogue — now understood.

## The technique

The course follows a few well-tested principles of audio language teaching. Write every unit with all of them.

### Anticipation

The narrator does not say the answer first. They set a task ("Thank her", "Ask whether she speaks English"), the
learner **answers aloud** during a pause, and only then the character's voice gives the right answer. Retrieving
the phrase oneself, even with a mistake, fixes it much better than repeating it. So every new item is **asked for**
in a prompt, not only heard.

### Graduated-interval recall

Each item comes back at growing intervals: inside the unit a few steps later and again near the end; then in the
**next unit**, then within 2 units, within 4, within 8. Each return is a **new situation**: the greeting learned at
the landlady's door comes back on the stairs with an elderly neighbour, and later at a bakery. About **a quarter**
of the prompts of a unit are review of this kind. The same lines are never repeated.

### Backward build-up

A long word or phrase is built **from its end**: *-gung … -digung … -schuldigung … Entschuldigung*. The learner
repeats each piece after the voice. Starting at the end keeps the stress and the melody of the whole word right,
and the learner never gets stuck at the beginning of something they cannot finish.

### A small core vocabulary, recombined

A few function words and frequent structures first (greeting, thanks, *I want*, *where is*, *I don't understand*,
the polite and familiar forms), then content words from the scene. New items are combined with known ones in ever
new sentences, so a small number of words already lets the learner say many things.

### A running story

Everything happens in a story with a recurring cast: the learner has just moved to the country (A), makes friends
and finds work (B), and at university talks about science and ideas (C). The scenes come from what really
surprises people from the narrator's culture in the taught country, so the learner also learns what to do there,
not only what to say.

### Sound first, grammar in use

The text is hidden by default; the learner listens first. Grammar is never lectured: the narrator says at most one
sentence on why a form is used here ("With a lady you don't know, use the polite form"), and the forms are
practised in use.

### The 80% self-check

At the end of a unit the learner asks themselves whether they answered **most of the prompts (about 80%)** without
help. If so, they go on; if not, they repeat the unit. Moving on with less makes the next units harder, not faster.

## Writing rules

1. Write the dialogues **in the taught language** from the start; never translate them from another language.
2. Use the **standard language** taught in grammars, as spoken in the country that bears the language's name.
   Dialects only in an optional, separate chapter, and only where a voice exists for them.
3. **Research politeness** before writing: when the formal and the familiar forms are expected, with whom, and how
   it differs by age, place and situation. Write the result in the story bible, with sources.
4. Research **what surprises newcomers** in the taught country **and** the habits of the narrator's own culture;
   write the scenes where the two expect different things.
5. Keep to the **CEFR** level of the unit and to the topics of the matching Learn lessons; change a topic only where
   another one fits the difficulty better.
6. Each unit introduces **10–20 new items** (words or fixed phrases) and has **one dialogue of 8–10 lines**.
7. Every new item is **asked for in a prompt** at least twice in its unit, spaced apart, and **comes back** in the
   next unit and then at intervals of 2, 4 and 8 units.
8. About **25 %** of a unit's prompts are review, each in a **new situation** that fits the story; never repeat an
   old line.
9. A prompt asks only for what the learner **already has**: items of this unit or earlier ones, and their
   combinations.
10. Build long words and phrases **from their end**.
11. The narrator **explains at most one sentence** at a time, in plain words, and never reads out grammar tables.
12. **Alternate the protagonist** between female and male forms (where voices for both exist), so all verb forms
    are practised.
13. Every cast member keeps **one voice** for the whole course; with too few voices, give a second character the
    same voice with another pitch, or a closely related language's voice.
14. Use **open material only**: write your own text, cite open sources, and never copy scripts, recordings or
    booklets of commercial courses.
15. Mark every line you are not sure of in `native_check`, so a native speaker confirms it before release.

## Story bible

One file per taught language: `tools/conversation/<code>/story-bible.yml`. Write it **before any unit**, and have
it read by someone who knows both cultures.

| Field | What to write |
|---|---|
| `language` | the code of the taught language, as in Casus |
| `narrator_languages` | the interface languages the narrator speaks (`pt` = Brazilian Portuguese) |
| `country`, `standard` | the country and the standard variety the course teaches |
| `voices` | every voice used: `id`, `role` (narrator or character), `lang`, `gender`, `tts` model, optional `pitch`; open licences only |
| `protagonist` | the voice for each `form` (f, m), background, how the forms alternate |
| `cast` | each recurring person: `id`, `name`, `role`, `voice`, `register` (formal or informal at first), `arc` |
| `formality` | `summary`, `rules` and `sources` of your politeness research |
| `culture` | `taught` (what surprises newcomers), `narrator` (notes per narrator language), `clashes` (scenes where the two differ) |
| `arc` | per level: number of units and a summary of the story |
| `native_check` | lines a native speaker must confirm |

## Unit

One file per unit: `tools/conversation/<code>/<LEVEL>-<NN>.yml`, for example `A1-03.yml`.

| Field | What to write |
|---|---|
| `id`, `level`, `number` | `A1-03`, `A1`, `3` |
| `protagonist` | the form used in this unit (`f` or `m`) |
| `title`, `situation` | in every narrator language: where, who, what is at stake |
| `learn_lessons` | ids of the Learn lessons this unit practises |
| `culture` | the clash from the story bible this unit stages, if any |
| `new_items` | `id`, `text`, `meaning` in every narrator language, optional `register` |
| `reviews` | the earlier items this unit brings back: `item`, `from` (unit id) |
| `steps` | the list below, in order |

Kinds of step:

| `type` | What it does |
|---|---|
| `narrator` | the narrator speaks: `text` in every narrator language |
| `dialogue` | the scene's dialogue: `lines` with `speaker`, `text`, `meaning`; at the end `again: true` replays it |
| `line` | a character says one item (`speaker`, `item`); the learner listens and repeats |
| `prompt` | anticipation: `ask` in every narrator language, `answer` (`speaker`, `text`), `items` it practises, `review: true` if it is review |
| `buildup` | an `item` built from its end: `parts`, the last one the whole item |
| `selfcheck` | the 80% self-check that closes the unit |

## Before you submit

- [ ] The story bible has politeness rules with sources, notes on both cultures and at least one clash per level.
- [ ] Every unit ends with the dialogue again and a self-check.
- [ ] No line copies a commercial course; sources are cited.
- [ ] Uncertain lines are in `native_check`.
- [ ] The checker reports no errors.

## Files and checking

```
tools/conversation/<code>/story-bible.yml
tools/conversation/<code>/A1-01.yml, A1-02.yml, …
python3 tools/conversation_check.py tools/conversation/<code>
```

The checker reports **errors** (a broken rule: a narrator language missing, a speaker outside the cast, an item
never asked for, an item that does not come back on time, a review that repeats an old line) and **warnings**
(sizes and shares outside the targets: number of new items, dialogue length, share of review). Fix every error;
look at every warning.
