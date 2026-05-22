# Pulse Rule Source Watch Runbook

## Purpose

Rule Library is the fixed baseline: product code owns stable tax sources and stable rules. Pulse is
the temporary-change layer above that baseline. Source watch jobs therefore route detected official
source changes into Pulse instead of creating internal rule-pack proposals.

## Schedule

- Cadence scan: every scheduled Worker run checks `pulse_source_state.next_check_at`.
- Weekly governance scan: Monday `09:00 UTC`, first 30-minute scheduled window only.
- Queue message per source: `pulse.rule_source.scan`.
- Catalog sync message: `rule.registry.catalog.sync`, sent by scheduled Worker runs.

## Source Outcomes

- `html_watch` / `pdf_watch`: fetch, archive raw text to R2, update source state freshness.
- Not modified: update freshness only; do not run AI extraction and do not touch concrete drafts.
- Changed content: create `pulse_source_snapshot` and enqueue `pulse.extract`.
- `manual_review` / `email_subscription` / `api_watch`: create a `pulse_source_signal` with
  `signal_type='source_check_due'` so operations can inspect the source and link the signal to
  Pulse when needed.
- Fetch failure: update source health and emit a Pulse metric; do not create a hidden rule-pack
  proposal.

## Pulse Behavior

`pulse.extract@v2` classifies source snapshots into typed changes:

- `deadline_shift`: customer-actionable due-date overlay when both original and new due dates are
  present.
- `filing_requirement`, `applicability_scope`, `form_instruction`, `source_status`,
  `new_obligation`, `other`: review-only Pulse changes.

Review-only Pulse alerts are visible in Pulse, can be dismissed, snoozed, or marked reviewed, and do
not write obligation overlays. Due-date overlays keep the existing apply, audit, evidence, email,
and revert workflow.

## Catalog Sync

Catalog sync still publishes the product-owned baseline into D1:

- New rule: create `new_template` review task for every active firm.
- Versioned changed rule: create `source_changed` review task only for firms that have active or
  historically reviewed that rule.
- Older open task for the same rule is marked `superseded`.
- Active practice rules remain active until the practice accepts the new version.

Catalog sync also enqueues `rule.concreteDraft.generate` for new or changed source-defined rules
and backfills any current-version source-defined rule that lacks a successful global draft.
