# P1 burndown — third pass

**Date:** 2026-05-21
**Branch:** `design/preview-integration`
**Reference:** `docs/Design/ux-audit-2026-05-21.md` P1 list

After the P0 burndown landed (`2026-05-21-p0-burndown-pass.md`), this
PR knocks down the seven P1 items. Six are concrete fixes that ship in
this PR; the seventh (status taxonomy convergence) is a research-only
audit doc that scopes a follow-up.

## P1 #1 — Status change `Undo` action in success toast

`updateStatusMutation` previously fired a toast with just the audit
hash. Destructive moves (`completed` → anything, `filed` → `in_review`)
were reversible in audit but invisible in the UI.

Restructured `apps/app/src/routes/obligations.tsx`:

- Moved the toast out of the base `mutationOptions.onSuccess` so the
  callback no longer owns user-facing chrome.
- `updateStatus` wrapper now takes `(input, previousStatus)`. Wires a
  per-call `onSuccess` that closes over `previousStatus` and attaches
  an `Undo` action to the toast.
- Undo re-fires `updateStatusMutation.mutate({ id, status: previousStatus })`.

Two callsites updated (`ObligationQueueStatusControl` and the J/K
keyboard hotkey path). Dashboard no longer has inline status controls
post-v1-deletion so nothing to wire there.

## P1 #2 — Rule library toggle → segmented control

Replaced the `<Button variant="outline">View all rules →</Button>`
floating at the strip's right edge with a real `<Tabs>` segmented
control:

```
[ Coverage map ] [ Rule list ]
```

The wrapper uses `Tabs` + `TabsList` + `TabsTrigger` from the design
system, bound to the existing `?view` URL state via
`onValueChange={switchView}`. No `TabsContent` — the page body still
branches on `view` independently because the matrix and list have
different layout containers.

The button-with-chevron reading as "navigate elsewhere" is gone. Two
same-weight pills signal "two ways to look at the same data."

## P1 #3 — Dashboard hero "what changed since" delta

New `DashboardHeroSubtitle` component
(`apps/app/src/features/dashboard/hero-subtitle.tsx`) sits under the
"Today" H1. Renders:

```
As of 9:42am  ·  3 new Pulse alerts since yesterday
```

Mechanics:

- Reads `duedatehq:dashboard:lastVisit` from localStorage on mount;
  snapshots it before overwriting with `Date.now()` so the delta
  doesn't zero out mid-session.
- Compares against `publishedAt` on Pulse alerts to count "new since
  last visit."
- 8h threshold separates "since yesterday" (morning-glance copy) from
  "since you last looked" (same-day check-in copy).
- Falls back to `N Pulse alerts open` when nothing's new but alerts
  exist; quiet `As of HH:MM` when nothing to report.

Reuses the existing `usePulseListAlertsQueryOptions(50)` query — no
new network calls.

## P1 #4 — Smart Priority on Obligations row

Smart Priority was the default sort but rendered nowhere on the row —
users sorting by an invisible signal.

Added a 6px tone-coded dot to the left of the Client cell. Color maps
to score band:

- `score >= 70` → destructive red (urgent)
- `score >= 45` → text-warning (amber)
- `score >= 25` → state-accent-solid (info blue)
- `score < 25` → no dot (quiet rows stay quiet)

Tooltip shows `Smart Priority N.N · rank #N`. The full breakdown popover
still lives inside the drawer's SmartPriorityBadge.

## P1 #5 — Filter chip threshold ≥1 (was ≥2)

One-line change in `obligations.tsx` filter chip block. A single
non-obvious filter (e.g. `state=CA` set via header dropdown) is no more
discoverable than two — hiding the chip made the filter feel "stuck on"
without explanation.

## P1 #6 — `/rules/coverage` → `/rules/library` redirect

`/rules/coverage` is now a permanent redirect via `rulesCoverageAliasLoader`
in `router.tsx`. Preserves query params (`?rule=foo` passes through to
`/rules/library?rule=foo`). Internal `navigate('/rules/coverage')`
callsites updated:

- `rule-library-tab.tsx`: rule-detail deep-link now points at
  `/rules/library?view=matrix&rule=...`
- `CommandPalette.tsx`: Coverage palette entry points at
  `/rules/library?view=matrix`

Deleted the now-orphaned `apps/app/src/routes/rules.coverage.tsx`
route file. The legacy URL still resolves (one redirect hop), but
internal navigation is direct.

## P1 #7 — Status taxonomy convergence (audit only, no code)

Status fragmentation runs deep. Three taxonomies exist:

1. **Legacy** (~10 states) in production
2. **Lifecycle v2** (~6 states, gated by `useLifecycleV2()`)
3. **Canonical 6-state target** per design brief

Spawned a research agent to produce the migration map:
`docs/Design/status-taxonomy-migration-map.md` (488 lines).

The doc enumerates:

- 31 production source files that branch on status (4 contracts, 2
  core, 6 db repos, 6 server, 13 app UI) — 79 consumer entries with
  file paths + line ranges
- Database surface area (`obligation_instance.status` has no SQL
  CHECK constraint — purely TS/Zod, which makes the migration easier)
- 6-PR rollout order with risk per step
- Acceptance criteria

**Effort estimate: L** (6 sequential PRs). Risk concentrated in PR 2
(data backfill with audit-log replay for `extended` rows) and PR 3
(rename across ~30 files). Could compress to M with a simpler product
call on legacy `extended` and `not_applicable` handling.

Key surprises:

- `useLifecycleV2()` already defaults `true` on this branch — the
  rollout is already in the "shipping" half of the flag.
- `decideObligationExtension` (`apps/server/src/procedures/obligations/_service.ts:651`)
  is the only writer of `status='extended'`. Its path-flip from "set
  status" to "mutate due_date + audit event" is more than a rename.
- `obligation_saved_view.query_json` carries legacy status values
  that must be rewritten in the same migration or saved views silently
  lose their filters.
- The Path-to-Filing chevron in `obligations.tsx:5620-5674` has to
  retain legacy-status awareness _forever_ to read historical audit
  events. The migration map calls this out as the one piece of
  legacy-aware code that survives.

Holding off on the code change until the maintainer (or me, in a
follow-up session) reviews the map and gives the green light.

## Type-check

Clean (`tsc --noEmit` exits 0 across all P1 changes).

## Score impact

Expected delta on the next critique pass:

- **Visibility of system status** (#1): up on Dashboard. Hero now
  carries a delta.
- **Consistency & standards** (#4): up on Rule library. Segmented
  control is honest about "switch view."
- **User control & freedom** (#3): up everywhere. Undo on destructive
  status moves; URL redirect heals back-compat without surprise.
- **Recognition over recall** (#6): up on Obligations. Smart Priority
  is now visible, not invisible. Filter chips surface at ≥1 active.

Audit re-score after this lands and the P0 pass should move all three
surfaces into the 28-32 / 40 band.
