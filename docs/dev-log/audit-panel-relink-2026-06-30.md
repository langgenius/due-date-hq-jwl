# Entity audit panel — "View in full audit log" reverse link (P2 de-isolation)

**Date:** 2026-06-30 · capability-gap P2

The "View in full audit log" reverse link (entity → firm-wide /audit?entity=)
lived OUTSIDE `EntityAuditActivityPanel`, in the rule drawer's wrapper only — so
the client Activity tab and Pulse alert Activity tab (the panel's other callers)
dead-ended with no path to the full log, and even the rule panel's empty state
("No audited rule changes yet") was a dead-end.

Moved the link INSIDE the panel (it already has `entityId`), shown below both the
events list AND the empty state, gated by the existing `audit.read` permission.
Removed the now-duplicate wrapper in `rule-detail-drawer` (RuleVersionHistorySection).
Verified: rule drawer shows exactly one link (no dupe) → `/audit?entity=<id>`.

De-isolation cluster notes (other candidates inspected, NOT changed):
- Workload member rows are ALREADY navigable (every numeric cell + the Open
  button route to the member's filtered deadlines via workloadRowHref) — audit
  false positive.
- Source-health deep-links (monitoring chip / "N source errors" badge →
  unfiltered Sources) are BLOCKED: `normalizeSourceHealth` collapses
  degraded/failing → 'healthy', so the Sources health filter ('all'|'healthy'|
  'paused') can't express "show errored sources". Needs the filter model
  expanded first — a real P2, not a link quick-win.
- Audit-log page breadcrumb is intentionally omitted (documented: a crumb would
  claim a parent the top-level route doesn't have). Left as-is.
