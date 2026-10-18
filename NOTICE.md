# Notices and attributions

Casus' own source code is open source (see `LICENSE`, to be added). All data sources are
public domain or share-alike; there are no commercial or proprietary dependencies.

## Whitaker's WORDS — public domain

`DICTLINE.GEN`, `INFLECTS.LAT` and `UNIQUES.LAT`, fetched by `tools/fetch_data.sh` from
`https://github.com/mk270/whitakers-words` (files live at the repository root) on
2026-08-20 (`UNIQUES.LAT` on 2026-10-02).

William Whitaker placed WORDS in the public domain. The files themselves are downloaded into
`vendor/` and are **not** redistributed by this repository. The derived index under `data/`
is built from them by `tools/build_index.py`; it is not committed at the moment (see
`docs/DATA.md`, the size gate), and when it is, it carries this same public-domain notice.
The one entry added by hand — *sum, esse* — is Whitaker's own (`tools/casus_build/extras.py`).

## Portuguese glosses — CC BY-SA

`data/glosses.pt.json` is derived from the **Portuguese Wiktionary** (pt.wiktionary.org), through
the Wiktextract extraction published at kaikki.org (`ptwiktionary/Latim/`, extraction of
2026-10-16 from the dump of 2026-10-01; fetched 2026-10-18 by `tools/fetch_glosses_pt.sh`,
built by `tools/build_glosses_pt.py`). Wiktionary text is licensed under the
**Creative Commons Attribution-ShareAlike** licence (CC BY-SA 4.0) and the GFDL; the
contributors are the editors of the Portuguese Wiktionary. That file therefore carries
attribution and share-alike obligations and is **separately licensed** from the public-domain
Whitaker-derived assets. It is never blended into them: the page loads it as its own layer and
labels every Portuguese gloss with its language badge.

Coverage, measured 2026-10-18: 1,718 of the 38,179 lemma records (4.5%); 12.1% of the records
Whitaker tags as frequent (A–C). It is a convenience layer for common vocabulary, not a
headline feature (spec §12 question 3); the page falls back to English and says so.

## Sample passages

Ancient works are long out of copyright. Modern critical editions can carry rights in their
apparatus and editorial choices, so each bundled passage records its source and edition in
`data/samples/SOURCES.md`, and passages are kept short.

## Development dependencies

- vitest — MIT
