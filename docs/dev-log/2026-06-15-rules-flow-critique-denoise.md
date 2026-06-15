# Rule Library — full-flow critique de-noise

Date: 2026-06-15 · Yuqi `/design-critique` + `/critique` on the entire
`/rules/library` flow (overview → jurisdiction → single-rule decision → modals).

Fixes for the Usability / Visual-hierarchy / Consistency findings. Companion
canonical doc: `docs/Design/rules-review-modals.md`.

## Overview (`routes/rules.library.tsx`)

- **"Start review" scoped to a previewable batch.** It selected all 456 pending
  and opened the bulk modal *over* the impact/accept cap
  (`BULK_ACCEPT_BATCH_MAX`), so the modal showed "untick to see impact" with
  Accept disabled. Now it selects the first `BULK_ACCEPT_BATCH_MAX` so the modal
  opens with a real readiness read (and the blocked-banner explains the
  draft-gate honestly). Button reads "Start review (100)" when the backlog
  exceeds the cap; the rest stay queued.
- **Banner date de-duped.** Dropped "Oldest waiting since {date}" — the
  StatBand's PENDING REVIEW sub already owns that date. Banner now carries
  action framing only.
- **"Where to start" rows carry only differentiators.** Dropped the absolute
  "oldest {date}" (it restated the same timestamp as "Nd waiting" and was
  identical on every row in single-cohort data) and the "No high-severity"
  label (absence reads as none). Row = high-severity (when present) · Nd waiting.
- **Backlog composition.** Hides zero severity rows (was showing "Low 0"); hides
  the "By reason" list when there's a single reason (it just restated the
  pending total already in the StatBand + banner).

## Single-rule detail rail (`features/rules/rule-detail-drawer.tsx`)

- **Section meta slot means one thing — a fact.** Applicability's right-meta was
  "Verify before Accept" (an instruction the group eyebrow "Verify the facts"
  already states); every other section's meta is factual (due-date
  classification / source count / version). Dropped it.
- **Gate messaging 3× → 2×.** Removed the "Accept unlocks once the draft is
  ready" footer hint — it restated the ⚠ disabled-reason already sitting next to
  the locked Accept. The gate now lives in its actionable "Before you accept"
  card (problem + Generate-draft remedy) and once at the button (so a greyed
  Accept is never unexplained). The two are spatially separated, different
  roles — not adjacent restating.
- **Consequence stated once.** The action paragraph was "Accepting activates
  this rule for client filings in {jur} for {entities}. Skip it if…"; its first
  clause duplicated the Impact card at the top of the rail. Trimmed to the
  unique skip-guidance.

## Deliberately not changed

- The floating bulk bar overlapping the last table rows is the shared
  `FloatingActionBar` primitive's standard behaviour across every bulk surface
  (deadlines, clients, etc.). Special-casing rules would break that consistency,
  so it stays.
- **Entry-framing for the all-blocked backlog** (every demo rule is
  source-defined → needs an AI draft, so Accept is always gated): the bulk
  modal's blocked-banner already explains this in-context. Reframing the overview
  to split "X ready · Y need a draft first" needs a per-rule readiness signal
  that isn't available at overview scope without firing the bulk preview —
  flagged as a product/data decision rather than guessed.

## Verification

`tsc` clean; lint 0 errors (pre-existing await-in-loop / `_`-const warnings).
Verified live: overview banner + rows + backlog de-noised; "Start review (100)";
detail rail reads consequence-once / skip-guidance-once / gate-in-card + at-button.
