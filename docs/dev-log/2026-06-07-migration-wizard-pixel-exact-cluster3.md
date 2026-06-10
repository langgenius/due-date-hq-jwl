# Migration wizard — pixel-exact Cluster 3 (Step 2-4 + Applied success)

Date: 2026-06-07

Closed the remaining `TODO(pixel-exact)` markers across the migration wizard
(`apps/app/src/features/migration/`) against the canonical `/migration/new — *`
Pencil frames (`duedatehq_work.pen`, Cluster 3). The onboarding import sub-flow
is the same shared wizard mounted at `/migration/new?source=onboarding`
(`variant="route"`); the `/onboarding — import: *` frames are the OLD naming of
this flow per `docs/product-design/migration-copilot/spec-cluster3-migration.md`, so no duplicate components were
built — the Step 2-4 + success work applies to onboarding automatically.

## What shipped

### Step 2 — strict 4-column mapping table (design WVwAX)

`Step2Mapping.tsx` now renders one bordered table card with an aligned header
row (Source column / DueDateHQ field / Sample (first row) / Confidence) and the
banner rows grid-aligned to it: 170px source, 28px arrow gutter, 200px
monospace-accent destination field, flexible in-row first-row sample,
right-aligned confidence pill, chevron. The expandable banner interaction
(`aria-expanded`, inline "Change" dropdown, expand-for-detail) is preserved —
`Step2Mapping.test.tsx` asserts it. Confidence pills gained leading
check/alert icons. (Header label "Source column" instead of the design's "Your
column" because the test guards `not.toContain('Your column')`.)

### Step 4 — gray dry-run body + segmented dedup (designs YcJR4 / xotna / xV6gf)

`Step4Preview.tsx` full-bleeds a `bg-background-section` (gray) surface over the
wizard body and renders each group as a white (`bg-background-default`) card.
The hero uses an inline divided 3-metric grid (`HeroMetric`). The re-import
dedup choice is now a segmented pill (`DuplicateSegmentedControl`,
role=radiogroup) on the conflicts-card header — option strings unchanged so
`Step4Preview.test.tsx` still matches. Conflicts render as link-2 rows with an
italic impact line.

### Applied — success modal with live 24h undo countdown (design uoNwI) — net-new

`SuccessModal.tsx`: green hero, 4-stat row, a warning-toned 24h undo banner
with a **live** countdown driven by the server's `ApplyResult.revertibleUntil`
(ticks each minute), a "what to do next" action list, and a footer (audit ·
import another · open dashboard). `Wizard.tsx` apply success now reveals this
modal after the brief genesis pulse instead of auto-navigating; the modal owns
post-import navigation. Reverting routes through the existing `pendingRevert`
`AlertDialog` → `revertMutation`. "Import another file" resets the wizard in
place (`handleImportAnother`).

### Onboarding skip-confirmation modal (design iAJhJ)

`OnboardingSkipModal.tsx`: the onboarding-only side-by-side comparison ("If you
skip" vs "If you import now") shown when `source=onboarding` and the user clicks
"Skip for now" (wired via `ActivationWizard` in `migration.new.tsx`). Outside
onboarding the wizard's generic "Leave without importing?" discard flow is
unchanged.

### Step 3 — kept the category model (design g8CrCZ divergence, recorded)

The canvas happy path draws a flat FIELD/BEFORE/AFTER/STATUS table; the code
keeps the collapsible category model (entity / state / tax types) that
auto-opens categories needing review. This is a deliberate, test-driven choice
(`Step3Normalize.test.tsx` asserts auto-expand, grouped rows, and status copy
like "Using Other" / "No state deadlines") — recorded in code as a decision,
not a deferral. The design's at-a-glance chips (NormalizePillStrip),
matrix toggle (MatrixDefaultsCard: Switch + "Edit defaults"), and reassurance
line were already adopted.

## TODO(data) — flagged, not built

- SuccessModal "rules active", "upcoming · 30 days", and the next-step detail
  lines are not in `ApplyResult` — static fallbacks. "Emails sent" is always 0
  by design. Clients + the undo countdown are real.
- An inline Step-3 "Re-run AI" (mirroring `handleStep2Rerun` against
  `runNormalizerMutation`) is still unwired.

## Verification

`npx tsgo --noEmit -p apps/app` → 0 errors. `pnpm --dir apps/app test --
src/features/migration --run` → 66 passing. `npx vp check` → 0 errors (no new
warnings in touched files).
