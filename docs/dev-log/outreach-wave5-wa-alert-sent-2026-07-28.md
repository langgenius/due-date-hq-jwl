# Outreach wave-5: WA covered-county first-alert sent (189)

2026-07-28

## What

Sent the Washington covered-county disaster-alert to **189 net-new CPA firms** — a
first-touch batch, not a re-hit. The existing 64-firm WA universe had all had t1/t2 +
a prior alert (4 touches, bot-only engagement), so re-hitting them would have been a
spammy touch-5. Instead we sourced fresh firms in the 25 IRS-covered counties.

- **Sourcing:** 10 research agents over two waves (King/Pierce/Snohomish/Thurston/Whatcom,
  then Clark/Benton/Yakima/Skagit/Chelan/Cowlitz/Olympic-peninsula/Lewis-Mason/small).
  191 net-new verified firms, 0 collisions vs the 1,617 master+suppress, all MX-valid,
  ICP-fit-gated. Dropped 2 (Erickson Wealth — email/domain mismatch; GDM Private Financial
  — wealth-leaning) → **189**. Lists: `wave5-alert-WA-189.csv` (send list),
  `wa-alert-newlist-2026-07-27.csv` (full sourced roster).
- **Copy:** Yuqi-authored, permission-first open, honest "8 counties added on 5/1" framing
  (does not claim IRS added King/Pierce), state-conformity insight, plain "we" voice.
  Lives in a WA branch of `buildAlert()` in the worktree `send-outreach.mjs`.
- **Deliverability:** HTML dropped every test into Gmail Promotions; **plain-text lands
  Primary**, so the send used `--text-only`. Links are clean short redirects `/r/wa` +
  `/r/wa-app` (Cloudflare `_redirects`) that 301 to the hub/app with UTM, so the plain-text
  body stays readable yet still attributes in Amplitude.
- **Countdown:** `--today 2026-07-28` pins the copy's "8 days" (host clock ran a day behind
  and a `ceil()` on a 23:59 deadline overcounted).

## Gotcha

The send command omitted `--limit`; the script defaults to `--limit 25`, so the first run
truncated at 25. Re-ran with `--limit 200`; the `--alert` gate skipped the already-sent and
finished the remaining 161 with no duplicates. **189/189** now carry an `alert` record.
Send window 2026-07-27 23:10Z – 2026-07-28 08:37Z (see `send-log-wave5-wa-2026-07-28.txt`).

## Prerequisite that gated the send

The email drives to `/r/wa` → the WA disaster page. That page was serving a stale 9-county
list (King/Pierce omitted) until the marketing deploy; a curl-verify of `/r/wa` (301 + UTM)
and the 25-county page content preceded the send.

## Open

Commit the worktree `send-outreach.mjs` WA branch. Watch Resend/Gmail for bounces/replies →
suppress before any next send. Standing ask: every future send should also drop one copy to
Yuqi's own inbox.
