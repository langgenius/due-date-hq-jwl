# Weekly digest — engagement rewrite + brand-voice alignment

2026-07-28

## Why

The generated weekly digest (`outreach-kit/build-digest.mjs`) read as a flat data dump —
its worst move was opening with "No new relief this week," which tells a CPA nothing happened
and to stop reading. Reworked for engagement, then evaluated against the product's own voice
via the `brand-voice` skill + `docs/marketing/messaging-canon.md`.

## Changed (`build-digest.mjs`)

- **Opening hook is dynamic and leads with the nearest concrete deadline**, never a flat
  "nothing new": "Nothing new was postponed this week — but Washington's is the nearest
  deadline: Aug. 5, 2026, 8 days out, with 2 more close behind." (Branches for new-this-week
  and quiet-week too.)
- **Each coming-due item leads with state · date · N-days-out, then the "who":** "Clients in
  24 Washington counties and 25 tribal nations." Day counts use calendar-day math (fixes the
  old `ceil()` +1 overcount).
- **"Also active" collapsed and deduped by state** (the two Montana tribal notices share Sept
  28 → one line; "7 states" not "8 notices"), keeping every state scannable without the wall.
- **Subject leads with the nearest, personal + urgent:** "Washington's IRS deadline is 8 days
  out — 2 more coming due" (was "3 IRS deadlines coming due within 30 days (WA, GA, HI)").
- **Close rewritten to canon voice:** "You run the firm; DueDateHQ catches the rule change —
  the moment the IRS, a state, or FEMA moves a deadline — and names the clients in your book
  it hits, with the source on every date." Echoes the canon subhead; drops the off-canon
  "watch the newsroom" line. Coverage phrased as `IRS · 50 states · DC · FEMA`; no
  predictive/radar/AI-word/bait-question per the canon bans.
- Honest cold footer retained ("you're a US CPA firm…"), the audience decision (opt-in
  subscribers vs the cold master) is still Yuqi's before any send.

Send path unchanged: `send-outreach.mjs --digest <txt> --text-only` (built earlier; lands
Gmail Primary).
