# Notices and attributions

Casus' own source code is open source (see `LICENSE`, to be added). All data sources are
public domain or share-alike; there are no commercial or proprietary dependencies.

## Whitaker's WORDS — public domain

`DICTLINE.GEN` and `INFLECTS.LAT`, fetched by `tools/fetch_data.sh` from
`https://github.com/mk270/whitakers-words` (files live at the repository root) on
2026-08-20.

William Whitaker placed WORDS in the public domain. The files themselves are downloaded into
`vendor/` and are **not** redistributed by this repository; only the derived index under
`data/` is committed.

## Portuguese glosses — CC BY-SA

*To be filled by Task 8 of the core plan.* `data/glosses.pt.json` will be derived from the
Portuguese Wiktionary via Wiktextract. Wiktionary content is licensed **CC BY-SA**, not public
domain, so that file carries attribution and share-alike obligations and stays separately
licensed from the Whitaker-derived assets. It must never be blended into them.

## Sample passages

Ancient works are long out of copyright. Modern critical editions can carry rights in their
apparatus and editorial choices, so each bundled passage records its source and edition in
`data/samples/SOURCES.md`, and passages are kept short.

## Development dependencies

- vitest — MIT
