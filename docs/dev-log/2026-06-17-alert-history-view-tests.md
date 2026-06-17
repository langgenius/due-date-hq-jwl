# Cover AlertHistoryView with tests (the pre-existing gap)

_2026-06-17_

When the dead `AlertsListPage historyMode` branch was excised
([2026-06-16-alerts-historymode-excision](2026-06-16-alerts-historymode-excision.md)),
its three tests went with it — and the note in `AlertsListPage.test.tsx` flagged
that the _live_ history surface (`AlertHistoryView`, behind `/alerts/history`) had
no coverage of its own. Closed that gap.

`AlertHistoryView.test.tsx` — 9 tests, modeled on the sibling `AlertsListPage`
harness (createRoot + act + `waitForText`/`waitFor`, `AppI18nProvider`,
`MemoryRouter`, a no-retry `QueryClient`). It mocks the one list the view reads
(`orpc.pulse.listHistory`) + `firms.listMine` (for the firm timezone), stubs
`AlertDetailDrawer` to a no-op (its own behavior is covered by
`AlertDetailDrawer.test.tsx`), and hoists the `DrawerProvider` open/close spies.

Covers the view's real logic:

- **Derived stats + tab counts** — a 6-alert fixture (one per outcome bucket)
  asserts All=6, Applied=2 (applied + partially_applied), Dismissed=1, Reverted=1,
  Expired=1, with `reviewed` counting only toward Handled.
- **Tab filtering** — Applied shows applied + partially_applied; **Expired maps to
  aged-out `matched`**.
- **Search** — substring narrows by title/source (drives the controlled input via
  the native value setter).
- **Grouping** — a recent + an old alert split into a `THIS WEEK` band and a
  `JANUARY 2026` month band.
- **Empty + loading states**, **row-open → openDrawer(id)**, and the
  **bulk-selection bar** ("1 alert selected").

Typecheck 0; lint clean; full alerts suite unaffected.
