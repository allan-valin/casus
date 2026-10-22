# Allan's UI/UX feedback, 2026-10-22 (phone)

[ ] = open, [x] = done and verified.

1. [x] Header: on a phone the whole first screen is flags. Line 1 = the site (folded: one button, the other two in its menu — "fold the 3 casus too"), XP chip, gear.
2. [x] A gear icon top right; every current header button goes inside it (UI languages, export, theme, report, help…).
       The level/XP chip stays visible outside.
3. [x] Inside the gear: the language list labelled as the target language ("Language to learn"), the UI languages
       labelled "Learning in", with an arrow between them besides the labels.
4. [x] View tabs: borders visible on all sides, like toolbar menu items.
5. [x] Drills: remove the language dropdown (choosing the language in the nav already selects it); all drill options
       go under one button that shows the current drill type.
6. [x] Learn: levels condensed the same way (one button showing the current level).
7. [x] Conversation: levels condensed the same way.
8. [x] Question: Learn felt like a full page reload when opening a lesson, Conversation instant. Answer + fix if real
       (first load fetches learn.json + lesson file; Conversation loads one course file once).
9. [x] Proofreading: the row "spelling grammar punctuation style capitals" between the text box and the checkboxes —
       explain it / make it clear.
10. [x] Proofreading (German): missing final full stop not flagged; a line break followed by lower case not flagged
       (needs "." above and capital below).
11. [x] Japanese conversation: furigana over kanji and romaji below, as elsewhere on the site.
12. [x] "fold the 3 casus too": the sites are one button, the other two in its menu.
13. [x] On a phone the view tabs fold into one button; the language chip is gone — the gear shows "flag → UI language".
14. [x] One control height (--control-h, 40 px) for buttons, pickers, gear, XP chip, tabs, selects.

Answer to 8: Conversation downloads the whole course once (5.6 MB for German), so every unit is instant after that;
Learn fetched each lesson (~90 KB) on click and jumped to the top — like a reload the first time, cached the second.
Now lessons stay in memory and the next/previous ones are fetched ahead.
15. [x] Phone: site (icon + arrow), view, level and gear on ONE line; the gear shows only ⚙, the "flag → language" line
       sits at the top of its panel.
Answer to 9: it is the colour key of the underlines — now labelled "Colour of each underline:" with a count per kind.
Fix for 10: own check (src/lib/proof/layout.js): paragraph end without "." and line break + lower case → "." above,
capital below; the engine's marks spanning such a break are dropped (LanguageTool suggested a comma there).
16. [x] Pronunciation tool inside Conversation does not handle inflected forms (verbs, cases): no reference IPA, so no
       comparison. Wiktionary only has IPA for the base form. Allan's idea: TTS the endings → pronunciation tool → IPA,
       then hand-correct against Wiktionary.
17. [~] Pronunciation in several accents (Wiktionary variants DONE: listed under each word, scored against the closest; espeak accent voices for en/pt/es/fr still open) (Allan, 2026-10-22). Findings: the learned espeak→Wiktionary rules are mostly
       notation (r/ʁ, ɑ/a), not real variants — do NOT show them as alternates (exception: vocalised r ɐ). Real variants:
       Wiktionary already has tagged variants for 14,363 German lemmas (Austria 1483, Southern Germany 954, Switzerland
       816, Bavaria 62 …) — show all with their region and score against the closest. espeak accent voices exist for
       English (us, gb, rp, scotland, nyc, 029, two English regions), Portuguese (pt, pt-br), Spanish (es, es-419),
       French (fr, be, ch), Russian (ru, ru-lv): generate inflected forms per accent there. German has one espeak voice.
