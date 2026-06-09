# Dev log — /alerts work-queue toggle + polish batch (2026-06-09)

A run of Yuqi page-feedback on the alerts surface (list + detail + dashboard
cards). No contract/data changes. Verified live; `tsgo` clean.

## Alerts list (`AlertsListPage`, `PulseAlertRow`, `AlertListRail`)
- **Review ⇄ Active work-queue toggle** — segmented control (Review first,
  default Review) splitting the list into two queues via `isActiveAlert`
  (`pulse-alert-chrome.ts`): Active = needs action (due-date overlay /
  deadline-shift **or** flags clients), Review = informational. Counts in the
  labels. Echoed in the detail rail so you can switch queues mid-review.
- **ACTIVE badge** — green dot+label on active rows + the detail header.
- **AI confidence → neutral signal meter** — replaced the green "high" pill
  (which collided with the new green ACTIVE badge and read like a status chip)
  with a 3-bar rising meter + `% conf`; only LOW keeps an amber tint. Source
  corroboration moved to the tooltip.
- **Circular StateBadge seal removed** from list row + rail (plain 2-letter
  code chip).
- **Row simplified** — dropped the 2-line summary dek (title clamps to 2 lines;
  full text in the drawer). Date headers kept (Yuqi likes them). The rail
  date's "N days ago" moved to a hover tooltip.
- **Empty state** — an empty queue with no active filters now shows the
  prominent "you're caught up" `AlertsEmptyState`, not the terse
  "no alerts match these filters" line.

## Alert detail drawer (`AlertDetailDrawer`)
- **Mark reviewed no longer closes the drawer** — it's a status change, not an
  exit; the detail updates in place via invalidate. (Apply/dismiss still close.)

## History (`AlertHistoryView`, `alerts.history.tsx`)
- Width unified to the active list (`md:px-8`, was `md:px-16`).

## Batch actions unified (`floating-action-bar` consumers)
- The alerts bulk bar now renders through the canonical `FloatingActionBar`
  (`tone="elevated"`, bottom-12 / z-40) — the same bottom-center floating pill
  /deadlines, /rules, /clients use (was a hand-rolled `motion.div` at a
  different offset/z-index). The permanently-disabled, backend-less **"Apply
  all"** button was removed (dead UI); the bar keeps the wired Dismiss + Clear.

Canonical design record: `docs/Design/today-alerts-feedback-amendments-2026-06-09.md`
(detail-pane surface model memory also updated).
