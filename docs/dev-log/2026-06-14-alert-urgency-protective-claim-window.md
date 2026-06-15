# Alert urgency — per-kind thresholds (protective-claim 60-day window)

_2026-06-14_

Follow-up to the urgency model
([brief](./_eng-brief-2026-06-14-alert-urgency-model.md) ·
[L1](./2026-06-14-alert-urgency-layer1-lib.md) ·
[L2](./2026-06-14-alert-urgency-layer2-row-pill.md) ·
[L3](./2026-06-14-alert-urgency-layer3-time-tag.md)).

## What

Deadline proximity is now **per change-kind**. `deadlineProximity` takes a
`ProximityThresholds` arg; `thresholdsForKind(kind)` returns it.

- **Default** (`DEFAULT_THRESHOLDS`): imminent ≤3d (urgent), soon ≤14d (high).
- **`protective_claim_window`**: imminent ≤3d, **soon ≤60d**. A protective
  refund-claim window is a hard legal cutoff, so it surfaces far earlier —
  mirroring the server scorer, which adds +45 (= the `high` threshold) when a
  protective-claim deadline is ≤60 days (`scorePulsePriority`, @duedatehq/db).

`imminentDays` stays 3 across kinds: a claim window closing within 3 days is
genuinely act-now (urgent); 4–60 days reads as high.

## Verified live (1465px, demo firm, Review tab)

The COVID protective-claim row (deadline Jul 10, **26 days out**) now shows an
amber **HIGH** pill + neutral mono **`26d left`**. Under the old flat 14-day
threshold it showed nothing. A 26-day `deadline_shift` still correctly reads
normal (no pill). 22 unit tests, tsgo clean. Screenshot in session.

## Not done

- Phase 4 — tune both horizons against the real `actionDeadline` distribution
  once there's production data. Other kinds (effective-window) may want their
  own thresholds then; the per-kind map is the place to add them.
