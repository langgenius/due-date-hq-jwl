# 2026-05-25 — Wizard copy + i18n audit + critical bug fixes

## Why

Genuinely-deferred ledger item **Wizard #40** — a copy + i18n
audit across the 5-step migration wizard. Greenlit in today's
"all yes" prioritization.

The audit identified ~25 actionable changes across 6 files. This
commit ships the audit doc plus the highest-impact i18n
bug fixes (untranslated aria-labels). The full copy refactor
(MessageDescriptor migration for the 12 plain-English strings
inside `intake-files.ts`, plus 4 toast-string plural-form bugs
in `Wizard.tsx`) is captured in the doc with file:line citations
and will land in a follow-up commit.

## Shipped

### Audit doc — `docs/Design/wizard-copy-audit-2026-05-25.md`

~900 words. Covers:

- Per-step inventory table (Step | File | strings reviewed |
  i18n coverage | top issues)
- ~25 file:line recommendations (current → proposed text →
  reason)
- Separate i18n bug list (untranslated strings + plural-form
  bugs)
- Cross-step consistency findings (4 verb-choice mismatches,
  2 tone breaks)

### i18n bug fixes — bare aria-labels routed through Lingui

Three `aria-label="..."` strings were rendering as English
regardless of locale:

- `Stepper.tsx:30` — "Wizard steps" → `t\`Wizard steps\``
- `Step3Normalize.tsx:159` — "Normalized value for ${row.rawValue}"
  → `t\`Normalized value for ${row.rawValue}\``
- `Step3Normalize.tsx:217` — "Suggested tax types" →
  `t\`Suggested tax types\``
- `Step4Preview.tsx:63` — "Safety" → `t\`Safety\``

Added `useLingui()` hooks in `Section` + `MatrixSection` inner
components of `Step3Normalize.tsx` so the `t\`` macro resolves
correctly in their scope. Stepper.tsx already had `Trans`from
Lingui but no`useLingui`; added the hook.

## Captured for follow-up (not in this commit)

These need either:

- A multi-file API change (converting
  `unsupportedUploadMessage` in `intake-files.ts` from `string`
  return to `MessageDescriptor` so it can be translated
  downstream at React render time)
- Or a careful copy-editing pass with verb-tense + tone
  consistency

Each is non-trivial enough to deserve its own commit-level scope:

- **`intake-files.ts` MessageDescriptor refactor** — 14 bare
  English strings (12 in `unsupportedUploadMessage` switch,
  2 inline ZIP warnings)
- **`Step1Intake.tsx:1141-1152`** — `friendlyParseError`
  returns 4 plain-English strings
- **`Wizard.tsx`** — 4 toast / overlay strings with baked-in
  plural forms (`Wizard.tsx:404, 524, 645, 648`)
- **`Step3Normalize.tsx:56, 245-249`** — two plural-form bugs
  where Lingui's `<Plural>` form uses JS template
  interpolation inside the `one`/`other` strings, which
  Lingui can't extract as named variables
- **Copy polish** — 11 cross-step consistency edits (e.g. "AI
  Mapper" vs "AI mapper", four phrasings of "needs review")
- **Length fixes** — the 38-word Step 4 alert and 30-word Step 3
  paragraph should be split or moved to tooltips

## Files touched

- `docs/Design/wizard-copy-audit-2026-05-25.md` (new, 108 lines)
- `apps/app/src/features/migration/Stepper.tsx` (aria-label +
  useLingui import)
- `apps/app/src/features/migration/Step3Normalize.tsx` (2
  aria-labels + 2 useLingui calls in inner components)
- `apps/app/src/features/migration/Step4Preview.tsx` (aria-label
  - useLingui import)

## Verification

- `vp check` → 0 lint/type errors across 669 files
