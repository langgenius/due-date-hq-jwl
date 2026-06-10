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
  - NOTE: the brief's _success_ state is LLM-generated and fails locally, so only
    the failed-banner surface + the LIVE pill are screenshot-verified; the success
    header chrome is tsgo-verified code.

Verified live on /today: LIVE pill bg #ecfdf3, Daily Brief bg #fff + #1018281f border.

## Wave 2 — #5 sync indicator → actions icon

- **#5** (`routes/dashboard.tsx`): the "Synced just now ↻" PageHeader **eyebrow**
  (its own row above the title) moved INTO the actions cluster, beside the My
  work / Everyone toggle, as an **icon-only** button (RotateCwIcon) with a tooltip
  ("Synced just now" / "Synced {age}"); click still refetches, spins while
  fetching. Reclaims a row of vertical space; the big "Today" title now anchors
  the top edge. Verified live.

## Wave 3 — #2 source truncation, #7 hover corner, #8 Docs tooltip

- **#2** (`needs-attention-card.tsx`): the alert-card bottom-meta row no longer
  wraps — `flex-wrap` dropped; the affected-clients line gets `min-w-0` + a
  `truncate` child, and the source span holds a **fixed `w-[150px]` + truncate**
  on the right. So "Affects N clients" and the source always share one line, with
  the affects-line truncating first under pressure. Avatars + confidence get
  `shrink-0` so only the affects-line compresses. Verified live.
- **#7** (`actions-list.tsx`): the Why-now corner glyph moved from the gutter
  (`-left-3`) to the line's left edge (flush with the action title) and grew to
  `size-3`; on row hover it fades in WHILE "Why now:" indents `ml-[18px]` to its
  right (transition-[margin]). At rest: hidden icon, text flush-left (approved
  default). Verified live.
- **#8** (`readiness-indicator.tsx`, shared primitive): the "Docs N/M" chip gains
  a `cursor-help` + `title` tooltip — "{N} of {M} expected source documents
  attached for this filing" — so the ratio's meaning is discoverable. Verified
  ("0 of 2 expected source documents attached for this filing").

## Wave 4 — #3 affected-clients priority

- **#3** (`needs-attention-card.tsx`): "how to better show affected clients when
  there ARE clients." The #2 pass had let the affects-line truncate (it clipped to
  "Affects…"), burying the very signal #3 cares about. Reprioritized: the
  affected-clients line is now `shrink-0 whitespace-nowrap` (+ `font-medium` when
  clients are matched) so "Affects N clients" always reads in full with its
  avatars; the **source** instead became the give-way element (`min-w-0
max-w-[160px]` + truncate). Net: affects-line always full, source truncates on
  tight cards — both #2 (source caps + truncates, shares the line) and #3 (clients
  shown clearly) satisfied. Verified live ("Affects 1 client" / "No clients
  matched" read fully).
