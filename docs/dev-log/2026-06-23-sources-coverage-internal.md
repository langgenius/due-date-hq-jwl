# Sources coverage matrix removed from customer route

**Date:** 2026-06-23
**Surface:** `/rules/sources` — `apps/app/src/features/rules/sources-tab.tsx`

## Change

Removed the `SourceCoverageSection` from the customer-facing Sources tab.
The page still shows the watched source registry, source health state, filters,
pagination, and KPI strip, but no longer renders the per-jurisdiction coverage
matrix or its "Catch up still-open windows" action.

## Reason

The coverage-by-jurisdiction matrix exposes internal watcher-role completeness
(`primary_web_news`, `email_signal`, `rule_source_watch`, rights-window signals,
and missing-role reasons). That is useful for backend verification and internal
coverage audit work, but it should not be visible to customers on `/rules/sources`.

This aligns the implementation with `docs/dev-file/11-Pulse-Ingest-Source-Catalog.md`,
which already treats the source catalog and coverage report as backend/dev-log/future
internal coverage UI facts rather than current customer UI.

## Verification Intent

`sources-tab.test.tsx` now asserts the Sources tab does not query
`pulse.listAlertSourceCoverage` and does not render the coverage heading, watcher-role
copy, catch-up action, or missing-role details even when a coverage payload is available
in the mocked RPC layer.
