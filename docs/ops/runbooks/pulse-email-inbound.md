# Pulse Email Inbound Runbook

## Scope

This runbook covers manual setup and smoke testing for government email subscription ingest. The
code path starts when Cloudflare Email Routing delivers a message to the Worker `email()` handler,
then continues through `R2_PULSE`, `pulse_source_snapshot`, and `PULSE_QUEUE`.

This runbook does not cover automatic subscription form filling. Ops still subscribes to government
lists manually.

## Cloudflare Setup

1. Enable Email Routing for the inbound domain in Cloudflare.
   - Cloudflare must manage DNS for the domain.
   - Email Routing adds MX records for the zone. Do not leave conflicting MX records active for the
     same domain.
2. Deploy the SaaS Worker so Cloudflare can list it as an Email Routing destination.
3. In Email Routing, enable subaddressing in Settings. The source registry depends on plus
   addressing such as `pulse-ingest+ny-email-services@<inbound-domain>`.
4. Create one custom address route:
   - Custom address: `pulse-ingest@<inbound-domain>`
   - Action: Send to a Worker
   - Destination Worker: `due-date-hq-app-staging` for staging, or the production Worker for prod
5. Do not enable catch-all routing to this Worker unless engineering explicitly asks for it. Catch-all
   will ingest unrelated mail and increase unmatched noise.

Cloudflare Email Routing routes a custom address either to a verified destination address or to a
Worker with an `email()` handler. Plus-addressed mail is captured by the base custom address only
when subaddressing is enabled.

## Subscription Addresses

Use the plus-address for each configured source when subscribing to official government lists.

| Source ID                    | Subscription address pattern                                  | Expected result                                                  |
| ---------------------------- | ------------------------------------------------------------- | ---------------------------------------------------------------- |
| `ny.email_services`          | `pulse-ingest+ny-email-services@<inbound-domain>`             | Snapshot source is `ny.email_services`; queues extraction        |
| `fed.irs_newswire`           | `pulse-ingest+fed-irs-newswire@<inbound-domain>`              | Snapshot source is `fed.irs_newswire`; queues extraction         |
| `oh.temporary_announcements` | `pulse-ingest+oh-tax-alerts@<inbound-domain>`                 | Snapshot source is `oh.temporary_announcements`; queues          |
| `fl.tips`                    | `pulse-ingest+fl-tax-publications@<inbound-domain>`           | Snapshot source is `fl.tips`; queues extraction                  |
| `wa.news`                    | `pulse-ingest+wa-dor-news@<inbound-domain>`                   | Snapshot source is `wa.news`; queues extraction                  |
| `ma.temporary_announcements` | `pulse-ingest+ma-dor-press@<inbound-domain>`                  | Snapshot source is `ma.temporary_announcements`; queues          |
| `tx.temporary_announcements` | `pulse-ingest+tx-comptroller-news@<inbound-domain>`           | Snapshot source is `tx.temporary_announcements`; queues          |
| Fallback only                | `pulse-ingest@<inbound-domain>`                               | Source attribution only if sender/List-ID/.gov URL is unique     |
| Unknown mail                 | `pulse-ingest@<inbound-domain>` with no trusted source signal | Snapshot source is `govdelivery.inbound.unmatched`; no CPA alert |

When a government list sends a confirmation email, confirm the subscription manually. Do not forward
confirmation links to customers.

## Local Smoke Test

Terminal 1:

```sh
pnpm --filter @duedatehq/server dev
```

Terminal 2:

```sh
pnpm pulse:email:smoke -- --fixture ny --domain duedatehq.com
pnpm pulse:email:smoke -- --fixture oh --domain duedatehq.com
pnpm pulse:email:smoke -- --fixture fl --domain duedatehq.com
pnpm pulse:email:smoke -- --fixture wa --domain duedatehq.com
pnpm pulse:email:smoke -- --fixture ma --domain duedatehq.com
pnpm pulse:email:smoke -- --fixture tx --domain duedatehq.com
pnpm pulse:email:smoke -- --fixture unmatched --domain duedatehq.com
```

The smoke script posts an RFC 5322 message to Wrangler's local Email Routing endpoint:
`http://127.0.0.1:8787/cdn-cgi/handler/email`. Each fixture includes a `Message-ID`, because
Wrangler local email routing requires one. By default the script adds a smoke nonce to the
`Message-ID` and body so repeated runs create fresh snapshots. Pass `--unique false` only when you
intentionally want to test duplicate handling.

Use `--endpoint` when Wrangler is not on `127.0.0.1:8787`, and use `--dry-run` to inspect the exact
from/to/query values without sending:

```sh
pnpm pulse:email:smoke -- --fixture ny --endpoint http://127.0.0.1:8788 --dry-run
```

## Verification

After a smoke test, inspect local snapshots:

```sh
pnpm --dir apps/server exec wrangler d1 execute DB --local --config wrangler.toml --command "select id, source_id, title, official_source_url, parse_status, raw_r2_key, fetched_at from pulse_source_snapshot order by fetched_at desc limit 10;"
```

Expected source IDs:

- NY fixture: `ny.email_services`, `parse_status='pending_extract'`, queued to `PULSE_QUEUE`.
- OH fixture: `oh.temporary_announcements`, `parse_status='pending_extract'`, queued to
  `PULSE_QUEUE`.
- FL fixture: `fl.tips`, `parse_status='pending_extract'`, queued to `PULSE_QUEUE`.
- WA fixture: `wa.news`, `parse_status='pending_extract'`, queued to `PULSE_QUEUE`.
- MA fixture: `ma.temporary_announcements`, `parse_status='pending_extract'`, queued to
  `PULSE_QUEUE`.
- TX fixture: `tx.temporary_announcements`, `parse_status='pending_extract'`, queued to
  `PULSE_QUEUE`.
- Unmatched fixture: `govdelivery.inbound.unmatched`, `parse_status='ignored'`; no
  `pulse.extract` queue message.

For deployed staging/prod, verify in this order:

1. Cloudflare Email Routing event/log shows the route delivered to the Worker.
2. Worker logs include `pulse.govdelivery.inbound_snapshot` with `matched=true` for a known source.
3. `pulse_source_snapshot` has the expected `source_id` and canonical source URL.
4. `raw_r2_key` exists in `R2_PULSE`.
5. Known matched mail reaches `PULSE_QUEUE`; unmatched mail does not.

## Troubleshooting

- Mail never appears in Worker logs: check MX records, route status, destination Worker, and whether
  subaddressing is enabled.
- Plus-address mail routes as unmatched: confirm the base route is `pulse-ingest@...`, not only a
  literal plus-address route, and confirm the source has `inboundEmail.localParts` configured.
- Snapshot exists but no CPA Alert appears: check `parse_status` and the `pulse.extract.result`
  metric. `ignored` means the extractor found no regulatory change; `failed` needs the failure
  reason; `duplicate` should refresh firm alerts when it points to an approved Pulse.
- IRS Newswire / GovDelivery messages are routed by the `USIRS` account code when present, even if
  they arrived through another plus-address. The stored R2 artifact keeps both decoded canonical
  email text for extraction and the raw RFC822 message for evidence review.
- Unmatched volume increases: inspect sender, `List-ID`, and body URLs, then add or tighten source
  registry metadata only after confirming the source is official.
