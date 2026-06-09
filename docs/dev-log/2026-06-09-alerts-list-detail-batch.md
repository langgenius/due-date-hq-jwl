# /alerts list + detail batch + scroll fix

Date: 2026-06-09

## Scroll fix (functional bug)

PulseAlertRow.tsx: the list frame `overflow-hidden rounded-[12px]` had default
flex-shrink, so flex shrank it to fit the column and overflow-hidden clipped the
rest → the overflow-y-auto list column never saw overflow → couldn't scroll.
Added `shrink-0` so the frame keeps full height; the column overflows + scrolls.
(overflow-hidden kept for the rounded day-band clip.)

## List / toolbar

- Row title → font-medium (L1).
- Row chips (state seal, high-impact, form TaxCodeBadge instance) → rounded-lg (L2).
- Row icons (external-link ×2, arrow) → strokeWidth 1.5 (L3).
- List/Map Segmented → h-9 to match search + dropdowns (L4).
- "Show suggested action" checkbox → moved before the dropdown cluster (L5).
- Time filter ("All time") → moved into the Filters popover as a "Time" section;
  standalone trigger removed; badge count includes it (L6).

## Detail

- Sources chip → converged onto /today's "Monitoring: Federal · 50 States · DC"
  treatment (label format + PulsingDot + neutral text), still links to /rules/sources (D8).
- DrawerActions footer → w-full so it fills the footer width (D9).
- AlertListRail search → focusing expands it to fill the bar (hides All/Unresolved),
  collapses back on blur when empty (D11).
- Alert detail pane → #f2f2f2 background; tinted flat blocks (source extract,
  practice-impact) nudged to white for contrast (D12). NOTE: supersedes the prior
  "alert detail = white" decision.

## Verify

tsgo clean; scroll confirmed (list column scrollH 1468 > clientH 745); list +
detail render at 1512×861; detail pane = rgb(242,242,242); no current console
errors (a stale HMR "PulsingDot" entry is buffered but the fresh load renders the
monitoring chip + no error boundary).
