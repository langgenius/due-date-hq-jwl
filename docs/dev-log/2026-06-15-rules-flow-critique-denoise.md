# Rule Library — full-flow critique de-noise

Date: 2026-06-15 · Yuqi `/design-critique` + `/critique` on the entire
`/rules/library` flow (overview → jurisdiction → single-rule decision → modals).

Fixes for the Usability / Visual-hierarchy / Consistency findings. Companion
canonical doc: `docs/Design/rules-review-modals.md`.

## Overview (`routes/rules.library.tsx`)

- **"Start review" scoped to a previewable batch.** It selected all 456 pending
  and opened the bulk modal _over_ the impact/accept cap
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

## Entry framing (U1) — resolved in a follow-up

The overview entry implied pending rules were ready to accept, but the real
first step for source-defined rules is generating an AI draft. The banner
subline now names the gate: "N need an AI draft before they can be accepted"
(e.g. 437 of 456), or "Each needs an AI draft generated before it can be
accepted" when the whole backlog is gated. The count is computed client-side
from the SAME structural facts as the server's `source_defined_requires_ai_review`
gate (source-defined rule + no ready concrete draft in the loaded draft map),
so it never contradicts the bulk impact preview; non-source-defined and
already-drafted rules are excluded (they're reviewable directly).

## Verification

`tsc` clean; lint 0 errors (pre-existing await-in-loop / `_`-const warnings).
Verified live: overview banner + rows + backlog de-noised; "Start review (100)";
detail rail reads consequence-once / skip-guidance-once / gate-in-card + at-button.
