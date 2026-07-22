# DueDateHQ cold outreach — how this campaign runs

> **⚠️ 2026-07-22 update — touches retired.** touch-2 is DEAD (Amplitude: generic touches
> produced 0 human sessions vs 28 for disaster alerts — do not send the 198 due).
> touch-3 (890 due) awaits an A/B decision: skip entirely, or rewrite as a farewell +
> alert-opt-in email; the generic version must NOT be sent. Alert campaign complete at
> 348/7 states; TX list (107) locked until the IRS notice actually posts (EM-3649 is an
> EM, not a DR — IRS follow-up not guaranteed). Full status:
> `docs/marketing/launch-runbook-2026-07-17.md` §B2.

**Status: LIVE (alerts only).** Day 1 = 2026-07-02. Wave 1 (Track A 2 + Track B 63) sent 65/65, zero failures.
Waves C1/C2 (70 + 70) complete the 205.

## The send path (script, not Mailmeteor)

Everything sends via `send-outreach.mjs` (Resend API, from `Gigi from DueDateHQ <gigi@duedatehq.com>`).
Touch 1 renders the locked **v12 light Inbox template** in code — plain system-font HTML,
one DueDateHQ link, text signature, no card/table/image attachment. The older
Mailmeteor/plain-text flow and the v11 card are retired.

The sender now auto-adds campaign tracking to every DueDateHQ link:
`utm_source=cold_outreach`, `utm_medium=email`, `utm_campaign=2026_07_cpa_outreach`,
and `utm_content=<wave>_t<touch>_track_<A/B/C>_body`. Do not put recipient email,
firm name, or personal identifiers in UTM fields.

```bash
cd outreach-kit
export RESEND_API_KEY=...            # sending-only key (Jerry/李敏) — never commit
export FROM="Gigi from DueDateHQ <gigi@duedatehq.com>"
export REPLY_TO="gigi@dify.ai"
export FOOTER_ADDRESS="548 Market St PMB 60083, San Francisco, CA 94104"

# waves (touch 1)
node send-outreach.mjs --touch 1 --send --wave ALL-trackC-part1.csv --limit 75 --delay 8000
node send-outreach.mjs --touch 1 --send --wave ALL-trackC-part2.csv --limit 75 --delay 8000

# follow-ups (script enforces the day gaps from .outreach-state.json)
node send-outreach.mjs --touch 2 --send --limit 75 --delay 8000   # ≈ 2026-07-06
node send-outreach.mjs --touch 3 --send --limit 75 --delay 8000   # ≈ 2026-07-12
```

Dry-run by default — add `--send` only when you mean it.

## Operating rules

- **Before every touch:** add repliers, "no thanks", and bounces to `outreach-suppress.txt`
  (one email per line). The script skips them.
- `.outreach-state.json` is the campaign's memory (who got which touch, when). Commit it
  after every send day. Never hand-edit.
- Replies land in Yuqi's inbox via Cloudflare Email Routing (gigi@duedatehq.com → Gmail).
- Touches 2/3 are plain-text follow-ups from `duedatehq-OUTREACH-sequence.csv` (subjects
  `re: DueDateHQ`), threading under touch 1. Their `duedatehq.com` mentions are rewritten
  to tracked URLs at send time.

## Files

- `duedatehq-MASTER-verified.csv` — 283 verified targets (205 emailable + 78 contact-form)
- `duedatehq-OUTREACH-sequence.csv` — per-target 3-touch bodies (touch 1 superseded by v11 in code)
- `ALL-track{A,B,C}*.csv` — wave lists · `ramp-day*.csv` — legacy ramp plan (unused)
- `send-log-day1.txt` — day-1 send log · `wordmark-2x.png` — signature logo (cid-embedded)
