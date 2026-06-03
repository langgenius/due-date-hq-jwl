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

## P0 follow-up

- Added `docs/ops/runbooks/pulse-email-inbound.md` with the Cloudflare Email Routing setup,
  subaddressing requirement, subscription address table, local smoke test, verification SQL, and
  troubleshooting notes.
- Added `mock/pulse-email-inbound/*.eml` fixtures and `pnpm pulse:email:smoke` so ops/engineering
  can POST RFC 5322 mail to Wrangler's local `/cdn-cgi/handler/email` endpoint before touching real
  government subscriptions.

## Email source expansion

- Added inbound routing metadata for `fl.tips`, `wa.news`, `ma.temporary_announcements`, and
  `tx.temporary_announcements`.
- Tightened fallback attribution so generic GovDelivery sender domains do not override source-specific
  `List-ID` or canonical URL signals.
- Added smoke fixtures for `fl`, `wa`, `ma`, and `tx`.

## IRS Newswire and MIME canonical text

- Added `fed.irs_newswire` as a federal inbound email source keyed by the `USIRS` GovDelivery
  account code and `pulse-ingest+fed-irs-newswire`.
- Added a narrow `USIRS` priority route so IRS Newswire can be attributed correctly even when a
  subscription confirmation delivered it through another plus-address.
- Changed inbound email archives to store decoded canonical text before the raw RFC822 payload in a
  single R2 artifact, so `pulse.extract` no longer fails guard checks on quoted-printable MIME text.
