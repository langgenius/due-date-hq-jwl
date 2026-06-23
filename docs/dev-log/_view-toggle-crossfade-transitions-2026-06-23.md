# View-toggle crossfade transitions (deadlines · clients · alerts)

**Date:** 2026-06-23
**Surfaces:**

- `apps/app/src/features/obligations/queue/DeadlineCardGrid.tsx`,
  `apps/app/src/routes/obligations.tsx` — /deadlines card ⇄ table.
- `apps/app/src/features/clients/ClientFactsWorkspace.tsx` — /clients
  portfolio ⇄ registry.
- `apps/app/src/features/alerts/AlertsListPage.tsx`,
  `apps/app/src/features/alerts/components/PulseAlertRow.tsx` — /alerts list ⇄ map.

When a surface toggled between its two views the incoming view hard-cut in. Now
it crossfades. One consistent treatment everywhere:

```
animate-in fade-in duration-300 ease-out motion-reduce:animate-none
```

- **Opacity-only** (the `fade-in` keyframe animates opacity 0→1) so the box size
  never changes — the responsive deadlines table-height measurement and the
  flex-1 fill of the card/map panels are untouched.
- **No new DOM nodes / no keys / no wrappers** that could shift a flex context —
  the class lands on each view branch's EXISTING root element (the branches
  already mount fresh on toggle via their conditional render, so the class fires
  on each switch).
- **300ms** — one step longer than the house micro-entrance tempo (200ms),
  because a view swap is a deliberate, larger transition (animation-principles:
  250–400ms for view/page transitions). `motion-reduce` disables it.

Per surface:

- **/deadlines** — class on the DeadlineCardGrid well root + the table-card div.
- **/clients** — class on the registry-table card root + the ClientPortfolioGrid
  root (ClientPortfolioGrid takes no `className`, so the class sits on its own
  DOM root — still opacity-only, layout preserved).
- **/alerts** — symmetric: class on the map-branch outer div, and
  `PulseAlertList` gained an optional `className` passthrough (merged onto its
  list-frame root) so the MAIN list instance fades too. The compact
  PulseAlertList in the map rail is deliberately left untouched.

/rules overview ⇄ table was left for a follow-up (its toggle lives in
`rules.library.tsx`, which a parallel session is actively editing).

## Verify

`tsgo` ui + app clean; `vp run @duedatehq/app#build` clean (pre-existing
chunk-size + INEFFECTIVE_DYNAMIC_IMPORT warnings only); `i18n:extract` →
0 missing, no catalog drift (className-only, no new strings). Verified live on
all three routes, both toggle directions: each branch carries the fade class and
renders at a sane (non-collapsed) height — deadlines table 1713px / cards lanes,
clients registry 580px / portfolio 1446px, alerts map 724px / list 557px.

## Notes

- Two view streams (clients, alerts) were built by parallel worktree agents
  against the shared `animate-in` spec, then cherry-picked + verified live here.
- A pre-existing, GLOBAL React "key prop spread" dev warning (a shared span-in-
  span primitive) shows on both /deadlines and /alerts — unrelated to this
  change; flagged as a separate task.

## Git

Built on `claude/polish-wave-2` off `origin/main` (a parallel session holds the
shared tree on its own active `claude/cross-page-connections` branch; that ref
is untouched). Pushed `HEAD:main`.
