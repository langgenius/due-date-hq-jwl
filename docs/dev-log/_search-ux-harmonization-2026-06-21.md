# Search UX harmonization — one standard across every search

**Date:** 2026-06-21
**Surface:** `apps/app/src/features/alerts/AlertsListPage.tsx`,
`apps/app/src/features/alerts/AlertHistoryView.tsx`,
`apps/app/src/features/alerts/components/AlertListRail.tsx`,
`apps/app/src/features/obligations/components/ObligationListRail.tsx`,
`apps/app/src/features/obligations/detail/DeadlineNavigatorRail.tsx`,
`apps/app/src/routes/obligations.tsx`, `apps/app/src/routes/rules.library.tsx`,
`apps/app/src/routes/icons.tsx`,
`apps/app/src/components/patterns/keyboard-shell/types.ts`,
`apps/app/src/components/patterns/keyboard-shell/ShortcutHelpDialog.tsx`,
i18n catalogs (en + zh-CN)

Audited every search field in the product (lists, rails, ⌘K palette, comboboxes,
dev galleries). The system was already ~80% cohesive — two primitives
(`SearchInput` default/compact + `CollapsibleSearch`) do nearly all the work and
there are almost no hand-rolled inputs — but the strings, shortcuts, and
zero-results states had drifted at the edges. This pass makes the edges match the
spine so a CPA's muscle memory carries between pages.

## The canon (was implicit, now consistent)

- **Verb rule.** `Filter X` = narrow a set already on screen (in-page
  list/table/rail → `SearchInput`/`CollapsibleSearch`). `Search X…` = query a
  corpus you can't fully see, or navigate (⌘K palette + comboboxes →
  `CommandInput`). The codebase already followed this; it was never written down.
- **Placeholder grammar.** Name the _collection_ when the noun is the whole
  searchable thing (`Filter rules`, `Filter notifications`); name the _fields_
  when search spans hidden columns. No trailing `…` for `Filter` (it's instant);
  `…` stays on `Search`.
- **Zero-results = recovery, not a dead-end.** When a query matches nothing, show
  the message + a `Clear filter` TextLink (the page-level alerts/audit/
  notifications empties already did this; the rails didn't).

## Changes

- **`/` hotkey parity.** /alerts was the only primary list page with no `/`
  filter-focus shortcut. Added an `alerts` `ShortcutCategory` (types.ts enum +
  ShortcutHelpDialog `CATEGORY_ORDER`/`CATEGORY_LABELS`) — same move that was
  made for `clients` — and wired `hotkey="/"` + `hotkeyMeta` on the
  `CollapsibleSearch` in AlertsListPage. `/` now expands-and-focuses the alerts
  search and lists under an **Alerts** header in the help dialog. (/deadlines
  already wires `/` hand-rolled via `useAppHotkey` + ref — left as-is.)
- **Rail zero-states got a Clear action.** ObligationListRail,
  DeadlineNavigatorRail, AlertListRail, and AlertHistoryView now render a
  `Clear filter` TextLink (accent/sm) below the empty message, gated on
  `search.trim()`. DeadlineNavigatorRail's empty was also re-aligned to the
  shared `px-[18px] py-10 text-center text-base` treatment its siblings use.
  AlertHistoryView keeps the exact sentence `No handled alerts match this view.`
  (asserted in its test) and appends the link inline.
- **Placeholder copy.** `Filter deadlines` → `Filter by client or form` (both
  deadline rails; matches clientName + taxType). `Filter alerts` →
  `Filter by title or source` (alerts list + rail; aria-label + help-dialog name
  stay `Filter alerts`). `/deadlines` main `Filter client, form, or assignee` →
  `Filter by client, form, or assignee`. `Filter rules…` → `Filter rules`.
  `Filter icons…` → `Filter icons` (dev gallery).

## Notes

- **Command palette: reviewed, no change.** "Search clients, navigate…" + the
  description "Search clients and navigate" are honest — the Deadlines/Alerts/
  Rules scope pills narrow the Pages list by design (no entity backend wired yet),
  so nothing over-promises.
- **i18n.** Four new strings (`Filter by client or form`,
  `Filter by title or source`, `Filter by client, form, or assignee`,
  `Clear filter`); zh-CN translated (按客户或表单筛选 / 按标题或来源筛选 /
  按客户、表单或经办人筛选 / 清除筛选) and catalogs recompiled.
- **Verified live** (fresh server from this worktree, not the stale 5173 bundle):
  new placeholders render, `/` expands+focuses the /alerts search, and the rail
  zero-state `Clear filter` both appears and recovers the list on click. tsgo
  clean; AlertHistoryView tests 9/9.
- **Open follow-up:** the verb rule lives only in code comments — a canonical
  Search section in `docs/Design/` is still outstanding.
