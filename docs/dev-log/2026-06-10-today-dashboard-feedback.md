# Dev log — /today dashboard feedback batch (2026-06-10)

Yuqi 8-item `/` feedback batch + "daily brief 修改成 Node ID: tvSsP".

## Wave 1 — header + Daily Brief

- **#1 MonitoringChip → "LIVE" pill** (`features/alerts/components/MonitoringChip.tsx`,
  shared by /today + /alerts): the chip now writes **LIVE** in a compact green
  pill (success tokens + pulsing dot); the full scope "Monitoring: Federal · 50
  States · DC" moved into the hover tooltip (now the tooltip's lead line).
- **Daily Brief → Pencil `tvSsP`** (`features/dashboard/daily-brief-card.tsx`):
  moved OFF the blue accent fill onto a **white card + single hairline border**
  (also satisfies the product-wide surface model — colored-fill regions pull back
  to white + hairline). Header rebuilt to `tvSsP`: a sparkles icon-wrap (the AI
  signal the accent fill used to carry) + "Daily Brief" (13/600) + freshness, with
  a **labeled "Regenerate"** button (was icon-only). Failed-state banner also moved
  to white + hairline + sparkles.
  - DEFERRED (no-fiction): `tvSsP`'s **jump-chips** (Alerts · 3 urgent / Actions ·
    4 waiting / Deadlines · 1 EOD / Sweep · 2 changes) and **Sources** row need real
    dashboard counts + citation source-labels — omitted pending that data wiring
    rather than faking counts.
  - NOTE: the brief's *success* state is LLM-generated and fails locally, so only
    the failed-banner surface + the LIVE pill are screenshot-verified; the success
    header chrome is tsgo-verified code.

Verified live on /today: LIVE pill bg #ecfdf3, Daily Brief bg #fff + #1018281f border.
