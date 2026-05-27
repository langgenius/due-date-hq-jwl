# Eighty-seventh pass — Tidy 2/N: unused exports (DEAD slice)

**Date:** 2026-05-26
**Branch:** `feat/jolly-hopper-46479d` (worktree `jolly-hopper-46479d`)

## What this pass does

Pass 1 removed orphan functions inside live files. Pass 2 audits the
opposite shape: symbols that are still `export`-ed but have zero
consumers anywhere in `apps/` or `packages/`.

This is the **DEAD slice** of the audit. A separate triage list of
**INTERNAL** candidates (symbols used inside their defining file but
not consumed externally — i.e. "over-exported") is documented at the
bottom and deferred to a future pass since acting on it means stripping
`export` keywords across ~50 files. That's a different kind of change
than what this pass commits.

## Audit methodology

1. For every `.ts`/`.tsx` file in `apps/app/src/` (excluding tests, dev
   shims, locale catalogs), extracted top-level `export function | const
| class | interface | type | enum` symbol names.
2. For each symbol, ran a bare-identifier `\b<sym>\b` grep across
   `apps/` and `packages/` and counted hits _outside_ the defining file.
3. Symbols with zero external hits were flagged as candidates.
4. Then split candidates by whether the symbol still has internal
   references in its defining file:
   - **DEAD** (inner_refs ≤ 1) — only the export line touches it.
     Truly removable.
   - **INTERNAL** (inner_refs > 1) — used inside the file but never
     consumed externally. Over-exported; safe to un-export but not to
     delete.
5. Cross-checked DEAD candidates against `scripts/` and `docs/` to
   confirm no missed references (only stale docs/dev-log mentions of
   `CoverageCell`/`CoverageLegend`/`OriginBreadcrumb` showed up; those
   are historical text, not consumers).
6. Manually inspected each DEAD candidate before deletion and chained
   downstream helpers that became dead as a result.

Result: **21 DEAD + 69 INTERNAL** from 90 raw candidates. 21 acted on
in this commit; 69 documented as Phase 2B (deferred).

## DEAD removals — 21 symbols / 14 files / +3 −799 lines

### Whole-file deletions

- `apps/app/src/features/priority/SmartPriorityBadge.tsx` — the
  obligations queue switched to an inline tier-label ladder (Urgent /
  High / Med / Low) for the Smart Priority column, so the standalone
  Popover-driven badge component lost its only call site.
- `apps/app/src/features/dashboard/risk-banner.tsx` — `RiskBanner`
  (DEAD) and its only-internally-used type `RiskBannerProps`
  (INTERNAL) were the entire file contents; the dashboard surfaces
  build their own banner shapes inline now.
- `apps/app/src/features/priority/` directory removed (empty after
  SmartPriorityBadge deletion).

### Per-symbol deletions (file stays)

- `client-readiness.ts` — `CLIENT_ENTITY_FILTERS` (constant array no
  one filtered against).
- `client-cycle.ts` — `clearClientCycleList()` (localStorage clear-all
  helper; nothing calls it).
- `client-query-state.ts` — `ClientsSearchParams` type (now defined
  inline at the one consumer site) + the now-unused
  `inferParserType` type import.
- `audit-log-model.ts` — `summarizeAuditChange()` + its supporting
  helpers `AuditSummaryLabels`, `DEFAULT_AUDIT_SUMMARY_LABELS`, and
  the internal `stringifyScalar()` (all chained dead).
- `audit-change-view.ts` — `describeAuditChangeCount()` + its lookup
  table `COUNT_FIELD_NOUNS` (chained dead after the function was
  removed).
- `rules-console-primitives.tsx` — `CoverageCell`, `CoverageLegend`,
  `OriginBreadcrumb`, `TableFooterBar` (artefacts of older Coverage /
  Library iterations; nothing imports them) + the now-orphaned
  `ConceptLabel` and `CoverageCellState` imports.
- `rules-console-model.ts` — `RULE_JURISDICTIONS`,
  `DEFAULT_COVERAGE_ENTITY_GROUP`, `CoverageEntityGroup`,
  `compactAcquisitionMethod()`, `compactSourceType()` + the
  now-orphaned `RuleJurisdictionValues` and `RuleJurisdiction` type
  imports.
- `billing/model.ts` — `BillingPlanInfo`, `parseBillingPlan()`,
  `parseBillingInterval()`, `isFirmOwner()` (consumers replaced these
  with inline checks during prior refactors).
- `components/primitives/state-badge.tsx` — `hasDesignedBadge()`.

## Verification

```
pnpm exec tsc -p apps/app/tsconfig.json --noEmit  → clean
pnpm exec vp lint apps/app                        → 0 warnings, 0 errors
pnpm exec vp run @duedatehq/app#test              → 13 pre-existing
                                                    failures in
                                                    rules.library.test.tsx
                                                    (KeyboardProvider
                                                    setup issue; same
                                                    13 fail on a stash
                                                    of these changes
                                                    too — unrelated to
                                                    this pass)
```

Net diff: **13 files changed, +3 −799 lines**. Two files removed.

## Phase 2B — INTERNAL slice (deferred)

The audit also surfaced **69 symbols that are exported but only used
inside their defining file**. These aren't dead — they work fine — but
the `export` keyword is misleading: it signals "public API," yet no
consumer imports them. Examples:

- `billing/model.ts` — `BILLING_PLANS`, `BILLING_INTERVALS`,
  `BillingPlanPricing`, `BILLING_PLAN_PRICING`, `BillingSearchParams`,
  `isBillingInterval`, and 4 others (all consumed by the live
  `paidPlanActive` / `serializeBillingQuery` etc. inside the same
  file).
- `i18n/query.ts` — 6 exports, all internal helpers of the locale
  query module.
- `routes/route-summary.ts` — `APP_DOCUMENT_TITLE`,
  `RouteSummaryMessages`, `RouteHandle` (consumed only by
  `RouteDocumentTitle` in the same module).
- `migration/intake-files.ts` — 5 type exports (`CanonicalFileKind`,
  `PreparedUpload`, etc.) used only by the parser in the same file.
- Various `*Props` interfaces (`EmailOtpSignInFormProps`,
  `AppShellProps`, `StateBadgeProps`, …) where the component is
  exported but the prop type is only referenced by the component
  itself.

Removing `export` from these is a no-op at runtime and a clarity win,
but it touches ~50 files. Holding off so this commit stays focused on
dead-code (deletion) rather than visibility tightening (rename / keyword
change). Will revisit in a dedicated tidy pass.

## Out of scope (still pending in the tidying series)

- Pass 3 — Primitive extraction (inline components in giant files
  → colocated feature files).
- Pass 4 — Deduplication.
- Pass 5 — Comment consolidation.
- Pass 6 — Type-safety tightening.
- **Phase 2B above** — the INTERNAL (over-exported) slice.

## Files

13 modified / removed:

- `apps/app/src/features/priority/SmartPriorityBadge.tsx` (removed)
- `apps/app/src/features/dashboard/risk-banner.tsx` (removed)
- `apps/app/src/components/primitives/state-badge.tsx`
- `apps/app/src/features/audit/audit-change-view.ts`
- `apps/app/src/features/audit/audit-log-model.ts`
- `apps/app/src/features/billing/model.ts`
- `apps/app/src/features/clients/client-cycle.ts`
- `apps/app/src/features/clients/client-query-state.ts`
- `apps/app/src/features/clients/client-readiness.ts`
- `apps/app/src/features/pulse/PulseDetailDrawer.tsx` (Pass 1
  carryover — already in staging)
- `apps/app/src/features/rules/rules-console-model.ts`
- `apps/app/src/features/rules/rules-console-primitives.tsx`
- `apps/app/src/routes/obligations.tsx` (Pass 1 carryover — already
  in staging)

New: `docs/dev-log/2026-05-26-eighty-seventh-pass-tidy-2-unused-exports.md`
