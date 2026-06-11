# /alerts responsive contract

Breakpoint contract for the alerts list + split detail view, mirroring the
deadlines contract (`reference_deadlines_responsive` memory): **Pencil frames
are the xl baseline only**; the shrink table below is the implementation rule
for everything narrower. Authored from a live width audit (2026-06-11:
1512/1366/1280/1100/1024/900/768, both modes) — pre-contract, the 380px rail
was rigid at every width, squeezing the detail to 306px at 768 with the
footer's Dismiss button clipped offscreen.

App sidebar behavior (expanded ≥xl / preference lg / collapsed md / hidden sm)
is inherited from the deadlines contract — not restated here.

## Split view (alert open)

| Element | xl ≥1280 | lg 1024–1280 | <1024 |
| --- | --- | --- | --- |
| Layout | 380px rail + detail | 380px rail + detail | **split dissolves** — rail hidden, detail full-width, breadcrumb "Alerts /" is the way back (drill-in navigation) |
| Detail chrome padding (header/body/footer/banner) | px-12 | px-6 | px-6 |
| Document measure | 760px cap, centered | fills (≤760) | fills (≤760) |
| Extracted-facts grid | 4-col | 2-col | 2-col (4-col crushed cells to ~116px below xl) |
| A/D kbd hints (top bar) | shown | hidden (`xl:` gate) | hidden |
| Footer audit note | shown | hidden (`xl:` gate) | hidden |
| Footer actions | one right-aligned row | same | same (fits ≥686px content) |

## List mode

| Element | xl ≥1280 | lg 1024–1280 | <1024 |
| --- | --- | --- | --- |
| Toolbar | one row | wraps — narrowing cluster row 1, display cluster row 2 | same |
| Map view | map ‖ 460px compact list side-by-side | **stacked** — map on top, full-width compact list below | stacked |
| List rows | full (90px time rail) | full | full (row content is flex-wrap safe; compact mode remains a panel-open behavior, not a viewport one) |

## Decisions of record

- The rail survives to **lg (1024)** — at 1024 the detail still gets 562px,
  which works with the 2-col grid + px-6. Below that, the navigator is not
  worth the squeeze: drill-in + breadcrumb replaces it. (MacBook-class
  1280–1512 viewports always keep the full three-pane layout.)
- Breakpoints are VIEWPORT-based (Tailwind `lg:`/`xl:`), not container
  queries — the rail/sidebar widths are fixed constants, so viewport width
  fully determines pane width; container queries would add machinery for no
  additional information.
- Verified live at 1280/1024/900/768: zero x-overflow, no clipped footer
  buttons, breadcrumb back present, map stacks `column` below xl.
