# /deadlines detail + list — unification polish rounds (2026-06-09)

Follow-on to `docs/dev-log/2026-06-09-deadline-detail-page-rzzww.md` (initial detail rebuild)
and `docs/dev-log/2026-06-09-deadlines-page-feedback.md` (first list pass). Yuqi page
feedback over several rounds; all page-mode / panel-closed guarded so `/clients`
panel + sheet are untouched.

## Detail page (ne4Fd parity + Alert-detail unification)

- **Hero top action cluster**: "Last activity {n} ago" + Copy link / Assign /
  Snooze / Mark filed moved to the top of the hero; bottom footer dropped in
  page mode.
- **Alert design system**: page body → `bg-background-subtle` (gray); the three
  date tiles render as bordered white cards (`PrimaryDeadlineStrip variant="cards"`,
  `rounded-[12px] border-divider-subtle bg-background-default`); the Status-tab
  workflow (stepper + what's-left + active stage) wrapped in one white card via a
  `contents`-vs-card conditional (panel/sheet keep flat siblings).
- **Penalty card → 2-column**: real §6651 math + sources on the left, honest
  **Priority score** (`smartPriority` + `riskLevel`) panel on the right. FTA /
  "Risk score" fiction stays omitted.
- **Collapse-on-scroll hero**: `pageHeaderCollapsed` driven by the body
  `onScroll` (>16px) — title 22→16px, padding tightens, tax-year line + meta
  chip row hide; the date strip is non-sticky in page mode so it scrolls away.
  Mirrors `AlertDetailDrawer`'s `headerCollapsed`. Reclaims reading height.
- **Page-width rule**: hero + body + crumb center at `max-w-[1100px]` within
  `px-12`, mirroring the Alert detail's `[&>*]:mx-auto max-w-[760px]` rule
  (scaled for the two-column content + 340px rail).

## List page (`routes/obligations.tsx`)

Second feedback batch: at-a-glance banner is dismissible (localStorage), "Closing
the week" tag removed, Tax column hidden by default (`taxCategory` in
`DEFAULT_HIDDEN_COLUMN_IDS`), client name 14→15px, Jurisdiction cells → framed
outline badges.

Final batch:

- **#5** — Jurisdiction column header abbreviated to "Juris." (full word kept in
  the View menu + `aria-label`/`title`).
- **#9** — status 3-badge clutter → status pill on the primary row + a Today-style
  "why now" secondary line (corner glyph + "Accepted · Payment due") collapsing
  the quiet confirmations (awaiting-signature / accepted / payment-due).
  High-signal chips (Blocked / Rejected / Projected) stay on the primary row.
  Compact (panel-open) layout keeps its inline icons.
- **#3 / #4** — column-header row tightened 44→36px (`[&_thead_th]:h-9 py-0`),
  consistent with the 33px group band + the Alerts/Today header bands.
- **#10** — sticky toolbar carries the route's top padding when pinned: the bar
  gets `pt-6` cancelled at rest by `-mt-6` (full-page mode only), so resting
  spacing is unchanged but the pinned bar shows a 24px page-bg band instead of
  butting the viewport edge.

## Verification

`pnpm check` = 0 type/lint errors in the touched files (the repo's other format
flags are pre-existing parallel WIP). Verified live across the rail's full status
/ tax / entity / jurisdiction spread; collapse + page-width confirmed via
computed styles (title 22→16px; content block caps at 1100px on a 1920 viewport).

## Note on this commit

Committed the deadlines file-set only (`obligations.tsx`, `ObligationQueueDetailDrawer.tsx`,
`panels.tsx`, `router.tsx` + new `routes/deadline-detail.tsx`,
`features/obligations/detail/*`). A parallel `rounded-md → rounded-lg`
design-system pass is in-flight across the repo and is intermingled in these same
files; those adjacent cosmetic edits ride along in this commit. The broken
`AlertsListPage.tsx` (`isActiveAlert is not defined`) and ~90 other WIP files were
intentionally left unstaged.
