# 2026-06-11 — Alert detail content organisation (Yuqi batch 4, 21 items)

The directive behind the batch (#18): "be harsh and professional on the
content organisation — smooth and cohesive to read." The pattern across all
21 items was the same disease: **the same fact stated in two or three places,
each in its own style**. The cure was deletion and consolidation, not new UI.

## One state, one phrasing (#1, #21)

- The header's "Needs Action" pill is REMOVED — it restated the status banner
  in a second vocabulary ("Pending your review" vs "Needs Action"), and Yuqi
  rightly asked what the relationship was. Now exactly one element narrates
  alert state: the banner.
- Banner title "Pending your review" → **"Awaiting your decision"** — the
  same phrase the Activity timeline's current-state node uses.
- Banner height h-10 → **h-[52px]** (`DetailStatusBanner` compact, #7) — the
  same row height as the panel top bar and the rail head, so the horizontal
  bands align across the rail ⟷ detail columns.

## Header = identity only (#2, #3)

- AI-confidence % removed from the header meta strip — its one home is the
  Source & confidence card. Header meta is now: Active/High-impact pills,
  jurisdiction, change-kind chip ‖ source · time.
- Title leading 1.25 → 1.3 (#3 — two-line 22px titles read cramped).

## Top bar = real chrome (#12, #13, #14)

- The top bar no longer caps to the 760px document column — chrome spans the
  panel, so the close X sits in the top-right corner (it floated mid-panel
  before) and the breadcrumb hugs the left edge. px-12 → px-5.
- Breadcrumb chevron removed (#14) — slash path OR back arrow, not both.
- Breadcrumb title leaf capped at 360px (#12).

## Source & confidence card rebuilt (#15, #16, #17)

- "Open original" moved to the card's header band (headerRight).
- Both inner sub-headers deleted ("Source extract", "How confident we are ·
  where this came from") — the card title covers them.
- The 2-col provenance grid deleted: it re-stated the source link (now in the
  band), the publish date (in the citation line), and the audit note (in the
  footer). Replaced by ONE hairline confidence row: `90% · HIGH CONFIDENCE`
  left, the what-to-do guidance right. The 18px display number is gone.
- `DetailSectionCard` headerRight standardized to **12/400 tertiary** (#16) —
  one universal band-meta size on every detail card (alert + deadline).

## Rail de-noised (#5, #6, #8, #9, #10, #11)

- Relative-time third line deleted (#9) — in a date-sorted rail it restated
  the date column. Time column is date + wall-clock, two lines.
- AI-confidence meter deleted (#10) — a detail-panel fact, not a navigator
  fact. Bottom meta is now only "Affects N clients", only when N > 0.
- Change-kind matched to the main row's demoted style (#8): caption-xs /
  medium / muted.
- External-link order unified app-wide (#5): **text first, trailing ↗** —
  rail + both PulseAlertRow source slots flipped from icon-first; the drawer
  header and Open original already read that way.
- `ListRailSection` loses its bottom border (#6, shared primitive — also
  deadlines/rules rails): hairlines under every control row over-segmented a
  floaty sidebar; the head's border stays (title ⟷ content is a real
  boundary), control rows separate by spacing.

## Footer (#19, #20)

- `DrawerActions` justify-between → **justify-end**: secondaries (Copy draft
  · Dismiss) sit immediately left of the primary CTA as one cluster. The dead
  mid-footer gap is gone; the only space-between is audit-note ⟷ actions.

## Fact grid (#4)

- Cell vertical padding py-2.5 → py-3.

## Verified

tsgo clean, no console errors. DOM probes at 1512×861: banner 52px /
"Awaiting your decision"; no chevron; close X 20px from the panel's right
edge; header carries no Needs-Action pill and no conf %; card band meta
12/400; footer buttons contiguous right cluster; rail rows: no conf meter,
2-line time column, kind 11/500 muted, source text-first, section rows 0px
border (head keeps 1px).
