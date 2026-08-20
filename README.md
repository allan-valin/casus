# Casus

A reader for classical Latin. The text stays untouched on the left; on the right the same
words become colour-coded blocks that can be dragged, grouped and sorted until the sentence's
structure is visible. Colour carries case, brightness carries number, and a word whose case is
genuinely ambiguous is shown as ambiguous rather than guessed at.

- Design: `docs/superpowers/specs/2026-08-20-casus-design.md`
- Implementation plan (core): `docs/superpowers/plans/2026-08-20-casus-core.md`
- Data provenance and field layouts: `docs/DATA.md`

## Development

Requires Node 20+ and Python 3.11+.

```bash
npm install                       # JS test harness (vitest)
npm test                          # run the parser module tests
python3 -m pytest tools/tests -q  # run the build pipeline tests
```

`vendor/` holds source data downloaded by `tools/fetch_data.sh` and is not committed. Only the
derived index files under `data/` are.
