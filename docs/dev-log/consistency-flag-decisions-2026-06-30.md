# Consistency review — flag decisions + first backlog fix

**Date:** 2026-06-30 · follow-up to `design-consistency-token-spacing-pass-2026-06-30`

Resolved the 6 ⚠️ flags from the review and applied the one clean fix. Detail in `/findings.md`.

## Decisions
- **F-016** (dialog-title casing) + **F-020** (container border/radius split): both **document-only** — they're principled conventions, captured in `docs/Design/copy-style-guide.md` / findings. No code churn.
- **F-002** RulesPageShell: keep as the sub-page shell, but it must compose `PageHeader` (verify/refactor) — backlog.
- **F-008** naming: `Badge` = primitive, wrappers = `<Thing>Chip` — document + targeted rename.
- **F-010** compact Selects: promote to a real Select size — backlog.
- **F-013** onboarding-skip emphasis: **swap** (fixed below).

## Fixed
- **F-013** — `OnboardingSkipModal`: "Stay and import" → `primary`, "Skip for now" → `secondary`. Emphasis now favors staying in the import flow. typecheck 0 errors.

## Backlog re-scoped after reading each site
Several flagged items were not bugs and were removed from the backlog:
- **F-014** split buttons (`obligations`, `ClientsCreateSplitButton`) are correct split-button controls — both halves primary is right; not competing CTAs.
- **F-011** Danger-zone Card border uses a valid `state-destructive-*` token (right role), not a raw bypass.

Genuine remaining (larger than labels implied): Select-compact size (F-009/F-010), `migration.new` PageHeader (F-003), RulesPageShell→PageHeader (F-002, touches a sibling session's alerts area), EmptyState adoption (F-015). Optional primitive enhancements: Card `destructive` tone, `ButtonGroup`.
