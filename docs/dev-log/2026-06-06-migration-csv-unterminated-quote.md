# Migration intake: unbalanced quote no longer swallows the whole file

**Date:** 2026-06-06
**Surface:** Migration Copilot Step 1 Intake (`/migration/new`, onboarding import)

## Change

Fixed the CSV/TSV tokenizer so a single unbalanced double-quote in an uploaded
or pasted file can no longer absorb every data row into the header record.

Previously the tokenizer followed RFC 4180 strictly: a `"` at the start of a
cell opens a quoted field that runs until its closing `"`. When a real export
contained an unbalanced quote in (or before) the header line — a `Name (DBA
"X")` column, an address with inch-marks, any field the source tool failed to
escape — the opening quote never matched, so the whole file collapsed into one
header record. The user saw **"We found a header, but no data rows. Add at
least one client row to continue."** for a file that genuinely had headers and
rows, blocking the entire import. That violated `PRD §0.3 铁律 2 — bad rows
MUST NOT block good rows`.

- `tokenizeRecord` (`packages/core/src/csv-parser/index.ts`) now reports
  `unterminated: true` when a record ends at EOF still inside an open quote,
  and takes a `quotesAsLiteral` flag that disables quote handling.
- `parseDelimited` does a two-pass parse via a new `tokenizeAll` helper: pass 1
  honors RFC 4180 quoting; **only** if pass 1 detects an unterminated quote does
  it re-parse with quotes treated as literal characters, recovering the good
  rows instead of collapsing them. Well-formed files (including legitimate
  quoted multiline cells and `""` escapes) take the identical path as before.

## Docs Alignment

No `DESIGN.md` / `docs/Design/` update needed. This is a parser robustness fix
behind the existing intake contract, not a visual or UX-flow change. The
canonical intake doc (`docs/product-design/migration-copilot/02-ux-4step-wizard.md`
§4) already states the "bad rows must not block good rows" guarantee this
restores.

## Validation

- Added 2 regression tests in `packages/core/src/csv-parser/index.test.ts`
  (unbalanced quote in the header; unbalanced quote mid-file).
- `pnpm -F @duedatehq/core test` → 267/267 pass.
- Typecheck clean (`tsgo --noEmit`).
- Deterministic battery confirms legit quoting (multiline cells, quoted commas,
  `""` escapes, CRLF, TSV) still parses identically.
- Browser note: this React 19 dev build does not fire `onChange` for
  programmatically-injected paste/change events, so the intake UI could not be
  driven from the preview harness; verification was done at the parser level
  where the defect lives.
