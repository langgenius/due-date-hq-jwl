# Rule Registry Reconcile Runbook

## Purpose

Weekly rule registry reconcile is a product-owned guardrail for official source freshness and
rule-pack changes. The Worker checks registered sources, archives changed source text, and creates
internal proposals. It does not directly edit `packages/core/src/rules/index.ts` and does not change
customer production rules.

## Schedule

- Cron gate: every Monday at `09:00 UTC`, first 30-minute scheduled window only.
- Queue message per source: `rule.registry.source.reconcile`.
- Catalog sync message: `rule.registry.catalog.sync`, sent by scheduled Worker runs.

## Source Outcomes

- `html_watch` / `pdf_watch`: fetch, archive raw text to R2, update source state freshness.
- `manual_review` / `email_subscription` / `api_watch`: create `manual_check_due` proposal.
- Not modified: update freshness only; do not run analyzer and do not touch concrete drafts.
- Changed content: create source snapshot, run schema-validated analyzer, record proposal.
- Analyzer/model/schema failure: record `analyzer_failed` proposal and ack the queue item.

## Developer Review

Use:

```sh
pnpm rules:reconcile:report
pnpm rules:reconcile:report -- --remote
```

Review open proposals, source snapshot IDs, R2 raw keys, affected rule IDs, proposed new rule IDs,
and linked `ai_output` rows. Then edit `packages/core/src/rules/index.ts` manually.

Rules:

- Evidence timestamp-only changes do not bump `rule.version`.
- Due date, applicability, extension policy, source mapping, or source-defined calendar semantic
  changes must bump the existing rule version or add a new rule.
- Dismiss or supersede proposals only after the rule-pack decision is reflected in code or explicitly
  rejected.

## Publish Behavior

After deploy, catalog sync compares current core rule templates against stored `rule_template` rows.

- New rule: create `new_template` review task for every active firm.
- Versioned changed rule: create `source_changed` review task only for firms that have active or
  historically reviewed that rule.
- Older open task for the same rule is marked `superseded`.
- Active practice rules remain active until the practice accepts the new version.

## Concrete Draft Cache

Source-defined draft identity is:

```text
ruleId + sourceId + rule.version + promptVersion
```

Catalog sync enqueues `rule.concreteDraft.generate` for new or changed source-defined rules. It also
backfills any current-version source-defined rule that lacks a successful global draft, so versioned
cache rollout does not leave the whole pending queue in `not ready`. Failed generation is operational
data only; review tasks remain open, and customer UI simply withholds the bulk-review checkbox until
a current-version draft exists.
