# Rule Impact card — real affected-clients count (irBJ8)

**Date:** 2026-06-10

irBJ8's Impact card reads "Activates this rule for **N clients** → M new
obligations". The obligation count was already real; the client count wasn't
returned by the API. Implemented it (per Yuqi: clients + team-notes are the two
to make real; coverage / queue-time / signer stay dropped).

- **Server** (`procedures/rules/index.ts`, `previewBulkImpactForSelections`): the
  estimate loop already iterates clients × ready-rules; now tracks an
  `affectedClientIds` Set (clients that would get ≥1 obligation) and returns
  `affectedClientCount`. The single `previewRuleImpact` delegates here, so it's
  covered too.
- **Contract** (`RuleBulkImpactPreviewSchema`): + `affectedClientCount`.
- **UI** (`RuleImpactCard`): summary → "Activates this rule for N clients → M new
  obligations" (real counts, plural-aware); honest "No client obligations yet"
  when zero. Dropped the canvas's "+X% coverage" (no metric). Read-more
  "View breakdown".
- Updated the 4 impact test fixtures for the new required field.

tsgo clean across contracts/server/app. Verified live: the Impact card round-trips
the field (AL = 0 → honest empty state).
