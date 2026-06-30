# Source health — "Needs attention" filter + deep-links (P2)

**Date:** 2026-06-30 · capability-gap P2

The Sources health filter only had 'healthy' | 'paused' — `normalizeSourceHealth`
collapsed the raw degraded/failing states into 'healthy', so the Alerts "N source
errors" badge + monitoring chip could only link to an UNFILTERED sources list
("click to see the broken feeds" landed you nowhere useful).

- `SourceDisplayHealth` gains 'attention' (folds degraded + failing).
- `normalizeSourceHealth` preserves degraded/failing → 'attention'.
- `countSourcesByHealth` + the Sources filter row gain an "Needs attention" facet
  (only rendered when count > 0, so healthy firms stay clean). `HealthBadge` now
  renders a warning-tone "Needs attention" badge instead of mislabelling broken
  feeds "Watched".
- Sources tab seeds `healthFilter` from `?health=` (healthy|attention|paused).
- Alerts "N source errors" badge → `/rules/sources?health=attention`; monitoring
  chip deep-links there too when amber (unfiltered when healthy).

Verified: `?health=healthy` seeds the Watched filter (aria-pressed). Seed firm has
all 392 sources healthy, so the attention facet correctly stays hidden.
