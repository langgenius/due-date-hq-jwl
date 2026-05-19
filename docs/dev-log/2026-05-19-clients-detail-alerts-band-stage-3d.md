---
title: 'Clients detail — alerts band (stage 3d)'
date: 2026-05-19
area: app
---

# Clients detail — alerts band (stage 3d)

Stage 3a–3c trimmed and reorganized the detail page. Stage 3d adds a
unified alerts band above Filings & deadlines that consolidates the
three "you should look at this now" signals — replacing the standalone
Radar impact card and introducing the missing extension-without-payment
warning the product model has been calling for.

## The band

Renders between the identity strip and Filings & deadlines, **only when
at least one signal fires**:

1. **Radar alerts** — when there are active matches affecting this
   client. Row shows count + up to 3 affected tax-type chips + "View on
   Radar" link to `/rules/pulse`.
2. **Extension filed but payment NOT extended** — anti-pattern #1 from
   the product model (`docs/dev-file/...`). Per the schema, Form 4868
   / 7004 extend filing only; payment is still due at the original
   date. The row fires when any obligation has
   `extensionState ∈ {filed, accepted}` and
   `paymentState ∉ {confirmed, not_applicable}`. Shows count + up to 3
   affected tax types. No CTA yet (the obligations table below shows
   the rows already).
3. **Missing required facts** — when `readiness.missingRequiredFacts`
   is non-empty. Row shows the gap (filing state and/or entity type) +
   "Add facts" link back to `/clients/:id` (which is where editing
   lives via the Filing jurisdictions DetailSection).

Band visual: warning-soft background, warning border. Each row: icon
on the left, two-line text in the middle (title + sub-detail), optional
CTA on the right.

## What was absorbed/dropped

- **`ClientPulsePanel`** (Radar impact card) — removed. Its summary
  surface is now the alerts band; the full detail lives on
  `/rules/pulse`. The component, its `pulseLoading` derivation, and
  the now-orphan `PulseMatchBadge` helper are all deleted.
- The detail page no longer renders a standalone Radar surface at all
  — only the alerts band row. Net win: one fewer card on the page.

## Data wiring

- New helper `findExtensionWithoutPaymentObligations` in
  `apps/app/src/features/clients/client-detail-model.ts`. Pure function
  over the obligations array.
- In `ClientDetailWorkspace`, a `useMemo` derives
  `extensionPaymentMismatches` from `obligations` and passes it into
  the alerts band.

## Files

- `apps/app/src/features/clients/client-detail-model.ts` — added
  `findExtensionWithoutPaymentObligations` and the two state-set
  constants it uses.
- `apps/app/src/features/clients/client-detail-model.test.ts` — new
  test covering the detector across the matrix of `extensionState` ×
  `paymentState` combinations (5 fixtures, expects 2 flagged).
- `apps/app/src/features/clients/ClientFactsWorkspace.tsx`:
  - New `ClientAlertsBand` + three row components
    (`ClientAlertsBandRadarRow`, `ClientAlertsBandExtensionRow`,
    `ClientAlertsBandMissingFactsRow`).
  - Wired into the detail render between identity strip and Filings &
    deadlines.
  - Deleted `ClientPulsePanel` and `PulseMatchBadge`. Removed
    `pulseLoading` (no longer used).
  - Added `findExtensionWithoutPaymentObligations` import and
    `extensionPaymentMismatches` memo.

## Validation

- `pnpm check` clean (579 files, 0 warnings, 0 errors).
- `pnpm --filter @duedatehq/app test -- --run` (40 files, **209**
  tests; +1 over previous stage).
- Manual on `http://localhost:5178/clients/<id>`: band hidden when no
  signals fire; appears with the appropriate rows when seed data has
  Radar matches / missing facts / extension-payment mismatches.

## Known follow-ups

- The "Add facts" CTA on the missing-facts row links back to the same
  client page — better target would be the Filing jurisdictions section
  pre-opened in edit mode. Holding off until we wire deep-section
  anchors.
- The Radar row links to `/rules/pulse` without a client filter.
  When Radar's list view gains a `?client=` filter, point the link
  there directly.
- The extension/payment row currently has no CTA. A "Show in obligations
  table" affordance would be helpful once the obligations table
  supports a row-scroll/highlight target.
- The 28-string `i18n:compile --strict` debt is unchanged by this
  stage. The new band uses `<Trans>` static strings; they extract
  cleanly but still need zh-CN entries before the strict compile
  passes.
