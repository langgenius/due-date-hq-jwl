# Tighter filter gap · unified page alignment (+ deadlines view note)

_2026-06-23_

## Tighter filter-row → table gap (/deadlines)

The queue column was `gap-4` (16px) between the sticky filter bar and the table.
Tightened to **`gap-3`** (12px) so controls + data read as one tight unit.

## Unify page alignment app-wide

Every route's page-shell container uses `max-w-page-expanded` (1440px) + `md:px-8`
— dashboard, deadlines, clients, rules, alert-history. The **`/alerts` list was the
lone outlier** (`max-w-[1440px]` hardcoded + `md:px-6`, 24px vs 32px), shifting the
content left/right edge 8px when navigating between /alerts and any other page.
Aligned both /alerts container branches to `max-w-page-expanded` + `md:px-8` — now
every main page shares one content width + left edge. (Other hardcoded `max-w-[…]`
are dev galleries, the alert drawer, the wizard, and narrow permission notices —
intentionally not page shells; left as-is.)

## Note — "deadlines default view = list"

This was requested, but `main` no longer has the card-view machinery
(`readStoredDeadlinesView` / `DeadlinesViewMode`): the parallel session's history
rewrite dropped the "signature views" feature (cards + urgency lanes). So
/deadlines is already **list/table-only** — "default to list" is satisfied by that
state. Whether to restore the card view (as a toggle) is a cross-session call left
to the user.

## Verification

tsgo 0 · build green. No new i18n strings (class-only changes).
