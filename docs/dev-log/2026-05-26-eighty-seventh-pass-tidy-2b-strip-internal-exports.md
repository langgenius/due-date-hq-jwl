# Eighty-seventh pass — Tidy 2B/N: strip `export` from internal-only symbols

**Date:** 2026-05-26
**Branch:** `feat/jolly-hopper-46479d`

## What this pass does

Closes Phase 2B of the Pass 2 unused-exports audit. Pass 2 had two
classifications:

- **DEAD** (no references anywhere) — already handled in Pass 2A.
  21 symbols deleted, ~800 lines gone.
- **INTERNAL** (used inside the defining file but no external consumer)
  — deferred because every fix is "delete one word" across many files.

This commit acts on the INTERNAL slice. For each over-exported
symbol, drops the `export` keyword. The function/const/type remains
intact; only its visibility changes from public-module-API to
private-to-file.

## Why bother

Reading `export` should mean "another file imports this." When 60-70%
of the exports in some files are private-by-accident, that signal
breaks. A new contributor reading `billing/model.ts` had no way to
tell which of its 28 exports were real public contracts versus internal
helpers.

After this pass, the rule is honest: an `export` keyword on a top-
level symbol means at least one other file in the monorepo consumes
it. The 66 symbols stripped here had zero external consumers.

## Audit methodology

Re-ran the Pass 2 audit since prior passes (Pass 3 extractions, Pass
4 dedups) shifted the candidate set:

```
For each .ts/.tsx file in apps/app/src (excl. tests, dev shims, locale
catalogs):
  For each top-level `export <kind> <Sym>`:
    ext_hits = grep -rlw "\b<Sym>\b" apps/ packages/ \
                 | exclude self file | count
    inner = grep -cw "\b<Sym>\b" <self>
    if ext_hits == 0 AND inner > 1: candidate
```

66 candidates surfaced (down from 69 in the original Pass 2 inventory;
some symbols crossed the file boundary during Pass 3 extractions).

## Action

For each of the 66, replaced the first occurrence of
`export <kind> <Sym>` on the recorded line with `<kind> <Sym>` —
deleting only the `export ` prefix. Visibility-only change; runtime
behavior identical.

## Symbols stripped (by file)

| File                                                    |                                                                                                                        Count |
| ------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------: |
| `features/billing/model.ts`                             | 7 (BILLING_PLANS, BILLING_INTERVALS, BillingPlanPricing, BILLING_PLAN_PRICING, BillingSearchParams, plus 2 plan-tier consts) |
| `i18n/query.ts`                                         |             6 (LOCALE_QUERY_KEY, localeQueryParser, localeQueryParsers, serializeLocaleQuery, LocaleQuery, LocaleQueryValue) |
| `features/migration/intake-files.ts`                    |                    5 (CanonicalFileKind, PreparedUpload, UnsupportedUploadCode, UnsupportedUpload, unsupportedUploadMessage) |
| `features/clients/client-readiness.ts`                  |                5 (RequiredClientFact, OptionalClientFact, ClientFactsSummary, FilterClientsContext, getClientSearchHaystack) |
| `routes/route-summary.ts`                               |                                                                    3 (APP_DOCUMENT_TITLE, RouteSummaryMessages, RouteHandle) |
| `features/migration/migration-summary-view-model.ts`    |                                                                      3 (MappingSummary, NormalizationSummary, MatrixSummary) |
| `features/evidence/extension-decision-evidence.tsx`     |                                                  3 (ExtensionDecisionEvidenceSummary/Detail, parseExtensionDecisionEvidence) |
| `components/primitives/state-badge.tsx`                 |                                                                       3 (StateBadgeSize, StateBadgeVariant, StateBadgeProps) |
| `routes/obligations.tsx`                                |                                                          2 (obligationQueueSearchParamsParsers, ObligationQueueSearchParams) |
| `features/permissions/permission-gate.tsx`              |                                                                                 2 (PermissionState, PermissionRequiredPanel) |
| `features/obligations/deadline-category-suggestions.ts` |                                                                          2 (FormVoucherSuggestion, ResolvedDeadlineCategory) |
| `features/migration/state.ts`                           |                                                                                                2 (DryRunState, WizardAction) |
| `features/migration/mapping-target-labels.ts`           |                                                                      2 (SELECTABLE_MAPPING_TARGETS, SelectableMappingTarget) |
| `features/audit/audit-log-model.ts`                     |                                                                        2 (AuditExportUnavailableReason, AuditActionLabelKey) |
| **15 more files**                                       |                                                                                                                       1 each |
| **Total**                                               |                                                                                               **66 symbols across 33 files** |

Notable patterns:

- **Props interfaces**: `EmailOtpSignInFormProps`, `AppShellProps`,
  `StateBadgeProps`, `RiskBannerProps`, `EmailOtpSignInFormProps`,
  `StateRuleActivationSelectorProps` — used only by their component
  function, never imported as a separate type.
- **Search-params parsers**: `obligationQueueSearchParamsParsers`,
  `BillingSearchParams`, `auditLogSearchParamsParsers`,
  `LocaleQuery(Value/Parser/Parsers)` — only the route file that
  defines them uses them.
- **Type-derivation chains**: `BILLING_PLANS` → `BillingPlan` type;
  `BILLING_INTERVALS` → `BillingInterval` type. The base const is
  exported but no one outside reaches for it.

## Verification

```
pnpm exec tsc -p apps/app/tsconfig.json --noEmit  → clean
pnpm exec vp lint apps/app                        → 0 warnings, 0 errors
```

Net diff: **33 files changed, 66 insertions / 66 deletions**. Every
hunk is `-export const X` / `+const X` style. Zero runtime change.

## Files

- 33 source files (each had 1-7 `export ` keywords stripped from
  internal-only symbols). See `git diff --stat` for the full list.
- New: `docs/dev-log/2026-05-26-eighty-seventh-pass-tidy-2b-strip-internal-exports.md` (this file)
