# 2026-05-23 Pulse Rule Source Watch

## Summary

- Replaced the internal rule-registry reconcile proposal path with `pulse.rule_source.scan`.
- Typed Pulse changes with `changeKind` and `actionMode`.
- Due-date shifts remain customer-actionable overlays; non-deadline source changes are review-only
  Pulse alerts.
- Removed the reconcile report script and dropped the reconcile run/proposal tables in migration
  `0051_typed_pulse_source_changes.sql`.
- Retired the manual `rules:concrete-drafts:*` report/inspect/backfill/snapshot root commands and
  their server scripts; source changes now enter Pulse instead of concrete-draft ops scripts.

## Behavior

- `html_watch` and `pdf_watch` sources create `pulse_source_snapshot` rows when content changes and
  enqueue `pulse.extract`.
- Manual/API/email subscription sources create `source_check_due` `pulse_source_signal` rows during
  the weekly governance scan.
- `pulse.extract@v2` can classify snapshots as regulatory or non-regulatory. Non-regulatory
  snapshots are marked `ignored`; regulatory snapshots create typed Pulse alerts.
- Review-only Pulse alerts can be dismissed, snoozed, or marked reviewed and never create due-date
  overlays.

## Docs

- Added `docs/ops/pulse-rule-source-watch-runbook.md`.
- Updated Rule Library docs to describe Rule Library as baseline and Pulse as the temporary-change
  layer.
- Removed concrete-draft CLI operating instructions from current Rule Library product docs.
