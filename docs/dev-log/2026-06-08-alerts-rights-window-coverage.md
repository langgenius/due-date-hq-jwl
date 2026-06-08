# 2026-06-08 · Alerts rights-window source coverage and protective claim windows

Implemented the first source-role pass for low-frequency/high-value Alert coverage and added a
review-only `protective_claim_window` Alert kind.

## Changes

- Added `rights_window_signal` to Alert source coverage roles without changing the meaning of
  `relief_or_disaster_signal`.
- Registered the first FED rights-window sources: Taxpayer Advocate Service Blog, IRS Actions on
  Decisions, and IRS Internal Revenue Bulletins.
- Exposed `rightsWindowSourceIds` through `pulse.listAlertSourceCoverage` and rendered the
  `Rights window` role in the Rules Sources coverage table.
- Added `protective_claim_window` across DB/constants/contracts/ports/AI schema and the Pulse
  extraction prompt. The prompt requires `review_only` and keeps legal uncertainty in
  `structuredChange.legalUncertainty`.
- Kept historical-policy extracts when `structuredChange.actionDeadline` is still current/future,
  so old COVID/Kwong-style policy periods can still produce actionable CPA review alerts.
- Added review-only fan-out behavior for protective claim windows: active firms get visible alerts,
  `matchedCount` stays 0, and `needsReviewCount` counts distinct clients with a FED obligation
  (open or closed, excluding `not_applicable`) in income, payroll/withholding, and
  information-compliance areas. The scan years are driven by the extract's
  `structuredChange.claimTaxYears` when present, falling back to the COVID 2019-2022 window.
- Added priority reasons for near protective-claim deadlines and rights-window sources. Rights-window
  scoring is keyed off `sourceId` on its own axis and is independent of the source-diagnostics
  `sourceNeedsAttention` signal, so a low-confidence (<0.5) rights-window item is no longer
  mislabeled as a diagnostics signal nor double-weighted.
- Required `structuredChange.actionDeadline` to be a single ISO `YYYY-MM-DD` date in the prompt — the
  floor-bypass, dedupe key, and 60-day priority window all parse it strictly.
- Added UI labels and detail facts for protective claim windows: action deadline, affected years,
  affected tax acts, evidence to gather, legal uncertainty, authority refs, and source excerpt/link.

## Validation

- `pnpm --filter @duedatehq/core test -- src/rules/index.test.ts`
- `pnpm --filter @duedatehq/ai test`
- `pnpm --filter @duedatehq/server test -- src/jobs/pulse/extract.test.ts src/jobs/pulse/rule-source-adapters.test.ts`
- `pnpm --filter @duedatehq/db test -- src/repo/pulse.test.ts`
- `pnpm --filter @duedatehq/app test -- src/features/alerts`
- `pnpm --filter @duedatehq/app i18n:extract`
- `pnpm --filter @duedatehq/app i18n:compile`
- `tsc --build` passes for `@duedatehq/db`, `@duedatehq/ai`, `@duedatehq/server`, and
  `@duedatehq/app`. The format short-circuit in `pnpm check` had been masking a type error: the
  db-local `PulsePriorityReasonKey` union (`packages/db/src/repo/pulse/shared.ts`) was missing
  `protective_claim_deadline` / `rights_window_source`, which esbuild-based vitest never catches.
- `pnpm check` still fails on pre-existing formatting issues in untouched files:
  `apps/app/src/features/alerts/AlertDetailDrawer.tsx`,
  `apps/app/src/features/alerts/AlertHistoryView.tsx`,
  `apps/app/src/features/alerts/AlertsListPage.tsx`, and four unrelated
  `docs/dev-log/2026-06-08-today-*.md` files.
