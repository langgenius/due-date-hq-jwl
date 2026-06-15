# Alerts — move the open-alert → queue-tab sync off the render phase

_2026-06-15_

Yuqi reported the Review/Active tab flipping to Active on its own (reported as
"scroll to the bottom of Review → it changes to Active"). I couldn't reproduce a
scroll trigger, but the open-alert → queue sync was a **render-phase `setState`**
that re-evaluated on every render of `AlertsListPage`, reading the refetchable
`alerts` set — exactly the shape that can flip state on an unrelated re-render
(scroll-driven setState in the open drawer, a window-focus refetch, etc.).

## Fix

Moved the sync from a render-phase conditional `setState` into a
**transition-keyed `useEffect`** (`AlertsListPage.tsx`):

```js
useEffect(() => {
  if (openAlertId === null) { queueSyncedAlertId.current = null; return }
  if (historyMode || queueSyncedAlertId.current === openAlertId) return
  const openAlert = alerts.find((a) => a.id === openAlertId)
  if (!openAlert) return // cold deep-link: re-runs when `alerts` arrives
  queueSyncedAlertId.current = openAlertId
  const q = isActiveAlert(openAlert) ? 'active' : 'review'
  setWorkQueue((prev) => (prev === q ? prev : q))
}, [openAlertId, alerts, historyMode])
```

- Runs ONLY when the open alert id (or the loaded set, for a cold deep-link)
  changes — never on scroll / hover / refetch re-renders, which structurally
  kills the "tab flipped and I didn't open anything" class.
- `queueSyncedAlertId` is now a **ref** (was state) — fires once per OPEN, reset
  on close, so a manual toggle afterwards is never overridden (a manual switch
  changes neither dependency).

This goes against the file's earlier "no useEffect" note, but this is the
canonical transition-sync case, and it removes a genuine render-phase
double-`setState` fragility.

## Verified live (1512)

- Cold deep-link `/alerts?alert=<active id>` → lands on **Active** (intended
  "land in the right tab" preserved).
- Open an active alert, manually switch to **Review** → stays Review, including
  after scrolling to the bottom (no snap-back).
- Scrolling the Review list to the bottom never changes the tab.

tsgo + vp clean.

Note: if Yuqi's flip had a different root cause than line 311, this still hardens
the only automatic tab-switch path; happy to re-investigate with an exact repro
if it recurs.
