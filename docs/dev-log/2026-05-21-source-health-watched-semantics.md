# Source Health Watched Semantics

## Context

CPA-facing source health previously used `healthy`, `degraded`, `failing`, and
`paused`. That made fetch/parser diagnostics look like product work for CPAs,
even though source content changes already flow through Pulse snapshots/signals.

## Change

- Enabled official sources now stay CPA-facing `healthy` / `Watched` after they
  are included in the watcher and successfully fetch/parse.
- Fetch/parser failures continue to update internal diagnostics:
  `lastError`, `consecutiveFailures`, next-check timing, metrics, and runbooks.
- `degraded` / `failing` enum values remain in contracts and schema for
  compatibility, but product UI normalizes legacy values to `Watched`.
- Coverage and Pulse no longer render source degraded callouts, review-source
  tables, or source-health warning rows.
- Existing enabled `pulse_source_state` rows in `degraded` / `failing` are
  migrated back to `healthy`.

## Validation Targets

- Source repo tests cover healthy defaults, failure-count preservation, and
  re-enable behavior.
- Pulse UI tests cover legacy degraded/failing source health staying out of CPA
  Pulse surfaces.
- Lingui catalogs must be regenerated because several CPA-facing labels changed
  from health language to watch language.
