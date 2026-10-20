# Which languages next: proposal (2026-10-20)

Allan asked: before Italian, research other languages and propose an order "based on available resources and number
of speakers for relevancy". Casus needs, per language: a Wiktionary extract with paradigms (the reader, the drills),
Tatoeba sentences with translations (Learn exercises), and ideally an openly licensed course (Learn lessons).
Measured today: size of the Tatoeba per-language export and of the kaikki.org Wiktionary extract. Speakers: total
(L1 + L2), approximate Ethnologue figures. Open course: from docs/LEARN-SOURCES-RESEARCH-2026-10-20.md.

| Language | Speakers | Tatoeba export | Wiktionary extract | Open course | Cases (Casus's strength) |
|---|---|---|---|---|---|
| English | 1,500 M | 24 MB | 3.2 GB | CEFR-J list (custom terms), ESL CC BY | no |
| Spanish | 560 M | 6.2 MB | 1.0 GB | Wikibooks (featured), Semillas (CC BY) | no |
| French | 310 M | 9.5 MB | 556 MB | Français interactif, Tex's French Grammar (CC BY) | no |
| Italian | 68 M | 9.4 MB | 735 MB | Italiano avanzato (advanced only, CC BY) | no |
| Ukrainian | 33 M | 1.9 MB | 286 MB | none found | **yes (7)** |
| Dutch | 30 M | 2.4 MB | 244 MB | **Wikibooks Dutch, complete (CC BY-SA)** | no |
| Hebrew | 9 M | 2.3 MB | 56 MB | none found | no |
| Lithuanian | 3 M | 1.7 MB | 78 MB | none found | **yes (7)** |
| Esperanto | ~1 M | 11 MB | 156 MB | (many free courses; licences vary) | accusative only |
| Tagalog | 83 M | 0.9 MB | 124 MB | none found | no |
| Romanian | 26 M | 0.5 MB | 305 MB | none found | yes (3) |
| Persian | 80 M | 0.5 MB | 88 MB | none found | no |
| Armenian | 6 M | 0.5 MB | 216 MB | none found | **yes (7)** |
| Vietnamese | 86 M | 0.4 MB | 78 MB | none found | no |
| Serbo-Croatian | 17 M | 0.6 MB | (split by variant) | Subotić & Forbes 1918 (PD) | **yes (7)** |
| Swedish | 13 M | 0.6 MB | 341 MB | DaLAJ error pairs (CC BY) | no |
| Indonesian | 200 M | 0.3 MB | 65 MB | none found | no |
| Bulgarian | 8 M | 0.3 MB | 173 MB | FSI course (PD, scans) | no (vocative only) |
| Hindi | 600 M | 0.2 MB | 158 MB | none found | yes (direct/oblique) |
| Bengali | 270 M | 0.2 MB | 37 MB | none found | yes |
| Slovak | 7 M | 0.4 MB | 51 MB | none found | **yes (6)** |
| Swahili | 80 M | 0.1 MB | 77 MB | none found | no |
| Thai, Urdu, Estonian, Slovene, Basque, Amharic, Yoruba | — | ≤ 0.1 MB | small | — | — |

## Recommendation

1. **Finish what is planned: English (for Brazilians), Spanish, French** — the largest audiences, the largest
   sentence sets, and openly licensed courses to import (Wikibooks Spanish, Semillas, Français interactif, Tex's French
   Grammar). French was asked for by name.
2. **Italian** — resources as rich as French (9.4 MB of sentences, 735 MB Wiktionary); the only open course is
   advanced, so its beginner lessons would be AI-written (tagged).
3. **Ukrainian** — the best fit for a *case* reader among the languages not yet in Casus: 7 cases, 33 M speakers,
   1.9 MB of sentences, a large Wiktionary extract; lessons AI-written after the open grammars (none is a course).
4. **Dutch** — the one language with a complete open course (Wikibooks, CC BY-SA), plenty of sentences.
5. Then, by fit and data: **Lithuanian** (cases, 1.7 MB of sentences), **Hebrew** (2.3 MB), **Serbo-Croatian**
   (cases, PD grammar), **Romanian**, **Swedish**.
6. Large-audience languages with thin open data — **Hindi, Bengali, Indonesian, Vietnamese, Persian, Swahili,
   Tagalog** — work for the reader and drills (Wiktionary is decent) but Learn would have few real sentences; best
   after the above, or as reader-only first.
7. Not recommended now: Thai (no word spaces: needs a segmenter), Amharic and Yoruba (almost no sentences), Estonian
   and Slovene (thin), Esperanto (huge Tatoeba but few speakers; easy to add later).

Every new language costs: the Wiktionary build (the reader, ~1–2 h machine time), its Learn content, and on Casus World
or a new site its own deployment. The reader alone is cheap; Learn is where the time goes.
