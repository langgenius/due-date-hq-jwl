# 2026-05-29 · Email inbound source attribution

## What changed

- Changed GovDelivery inbound email handling from a single `govdelivery.inbound` bucket to
  source-attributed snapshots for configured email subscription sources.
- Added internal routing metadata for `ny.email_services` so plus-addressed and trusted fallback
  inbox mail can resolve to the NY Tax Department email source.
- Kept unmatched inbound mail archived as `govdelivery.inbound.unmatched` without queueing
  CPA-facing Pulse extraction.
- Kept official tax email sources eligible for `due_date_overlay` extraction; only unmatched and
  legacy generic inbound mail remain forced `review_only`.

## Boundaries

- `/rules/sources` does not show subscription-source receive status in this pass.
- DueDateHQ does not create or subscribe government inboxes automatically. Ops must configure
  Cloudflare Email Routing for the real inbound domain and manually subscribe the routed address to
  each government list.
