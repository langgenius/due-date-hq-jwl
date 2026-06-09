# Engineering brief — Status bus + 18 cross-page integrations

**Date:** 2026-06-09
**Audience:** Implementation (Claude Code or human engineer can read top-to-bottom and ship)
**Companion memory:** `reference_status_propagation_spec`
**Companion design:** Pencil frames `csTbj` · `O27GWf` · `XlEte` · `chs0w` · `jnnk0` · `DibzZ`

## TL;DR

Status (`obligation.status`) is the product's primary key. Today it appears on ~6 surfaces, mostly read-only. The product's "tracking + monitoring" promise requires it to **drive 18 surfaces across the app** — and to update reactively wherever it appears.

Ship in three phases:

1. **Status bus + canonical primitives** (~1 sprint week). Single `useObligationStatus(id)` hook. Single `<ObligationStatusBadge>` component. Single `updateStatus` mutation. Nothing visible changes; everything becomes reactive. This UNBLOCKS the rest.
2. **6 P0 surfaces** (~2 sprint weeks). The loops partners actually run every day.
3. **8 P1 + 2 P2 derivations** (~2 sprint weeks). Pure presentation work once the bus is up.

Total: 5 sprint weeks for a 2-engineer team.

## Architecture — the status bus

### `useObligationStatus(id: string)` — the canonical READ hook

```ts
// apps/app/src/features/obligations/use-obligation-status.ts
export function useObligationStatus(id: string): {
  status: ObligationStatus // current value
  previousStatus?: ObligationStatus // last value in this session, for animations
  source: 'initial' | 'subscription' // helps animations decide if to play
  isLoading: boolean
}
```

Implementation: TanStack Query with subscription key `obligation:{id}:status`. Subscribes to a server-sent-events stream or polls every 30s (start with polling — SSE is a later workstream). Returns memoized result so consumer components don't churn.

**Every surface that displays status MUST use this hook.** No more `obligation.status` inline reads in components. This makes status changes propagate without manual prop drilling.

### `<ObligationStatusBadge id, variant?>` — the canonical display primitive

```ts
// apps/app/src/features/obligations/components/obligation-status-badge.tsx
export function ObligationStatusBadge({
  id,
  variant = 'pill', // 'pill' | 'dot' | 'mini-stripe' | 'segment'
  showLabel = true,
  className,
}: Props) {
  const { status } = useObligationStatus(id)
  // ...render canonical palette + label per variant
}
```

Variants:

- `pill`: dot 6×6 + label, padding `[3,10,3,8]`, cornerRadius 999 — for table rows, hero
- `dot`: just the colored dot 8×8 — for inline meta strips
- `mini-stripe`: 6-segment workflow bar showing where in journey — for `/deadlines` rows
- `segment`: a single big segment with eyebrow + count + dot — for `/today` heatmap bars

Palette mapping (canonical, never deviate):

| Status                    | Palette token | Dot fill                            |
| ------------------------- | ------------- | ----------------------------------- |
| `not_started` / `pending` | warning       | `$ddhq-state-warning-solid`         |
| `waiting_on_client`       | warning       | `$ddhq-state-warning-solid`         |
| `blocked`                 | destructive   | `$ddhq-state-destructive-solid`     |
| `in_review`               | accent        | `$ddhq-state-accent-solid`          |
| `filed` / `done`          | success-soft  | `$ddhq-state-success-solid` (muted) |
| `completed`               | success       | `$ddhq-state-success-solid`         |

### `obligation.updateStatus({ id, to, reason?, source })` — the canonical WRITE primitive

Already exists in `apps/server/src/procedures/obligations/index.ts`. No code change needed to the mutation itself. The wrapping client `useUpdateObligationStatus()` hook should be the only path UI uses:

```ts
const { mutate, isPending } = useUpdateObligationStatus()
mutate({ id, to: 'review', reason: undefined, source: 'auto_advance' })
```

`source` field: `manual` (user click) · `auto_advance` (monitored trigger fired) · `admin_override` (kebab menu). Audit row carries this.

### Event emitter — the propagation glue

When `updateStatus` succeeds on the server, the server emits `status.changed{obligationId, from, to, at}` to a Redis pub-sub channel. The client SSE/poll layer relays it. The `useObligationStatus(id)` hook for that id receives the update and re-renders all subscribers.

**Fan-out subscriptions** (also subscribe these):

- `client:{clientId}:*` — for client portfolio rollups
- `user:{userId}:needs-you` — for sidebar badges
- `filter:{filterHash}:distribution` — for `/deadlines` aggregate stripe

These fan-outs let the heatmap on `/today` re-render when ANY obligation's status changes, not just one.

## Touchpoint catalog — 18 surfaces

Implementations grouped by priority. Each entry has: path · mode · file location · UI element · acceptance criteria.

### P0 — 6 surfaces (the daily loops)

**1. `/alerts/[id]` Affects-status band** (DERIVE)

- File: `apps/app/src/features/alerts/AlertDetailDrawer.tsx`
- Insert: a banner ABOVE the existing body content, below Hero
- Data: server endpoint `alerts.predictTransitions(alertId)` → `Array<{ obligationId, from, to, triggerLabel }>`
- Visual: accent-hover bg + left destructive stripe + workflow icon + `PREDICTED STATUS IMPACT` eyebrow + headline `Resolving this alert will transition 5 deadlines: Waiting on client → In review` + secondary meta + `Resolve & transition →` accent CTA
- Pencil ref: spec inside `_eng-brief-2026-06-09-status-bus-and-integrations.md` (this doc)
- Acceptance: banner appears when `predictTransitions().length > 0`; collapses to zero-height when empty

**2. `/alerts/[id]` Linked-deadline row pill** (READ)

- File: same as above, inside the affected-clients table row
- Render: `<ObligationStatusBadge id={row.obligationId} variant="pill" />` after the form code column
- Acceptance: pill always reflects current obligation status via subscription

**3. `/alerts/[id]` Resolve action** (WRITE)

- File: `AlertDetailDrawer.tsx` primary CTA
- Wire: on click, fires `alert.resolve(alertId)`. Server-side, for each predicted transition, fires `obligation.events.noticeReceived({ obligationId, alertId })` which the state machine consumes
- Acceptance: clicking Resolve → 5 obligations transition simultaneously → all 5 row pills + the Pencil-designed `affects-status band` update reactively without page reload

**4. `/today` Stage heatmap drill-through** (DERIVE+READ)

- File: `apps/app/src/features/today/StageHeatmapCard.tsx` (new component)
- Data: `obligations.list({ assignee: 'me' })` then `groupBy(status)` → `{ not_started: 8, waiting_on_client: 14, blocked: 2, in_review: 5, filed: 9, completed: 27 }`
- Pencil ref: `XlEte` is the visual spec
- Each bar is clickable: routes to `/deadlines?status=${stage}&owner=me&group=owner`
- Each bar shows a `→ view N deadlines` hint below the count
- Footnote: `Click any bar to filter /deadlines by that stage`
- Blocked bar gets a destructive `↑ 1 new` badge when `count > 0 && newSinceLastVisit > 0`
- Acceptance: bars re-render when any of the user's obligations' status changes (subscribe to `user:{me}:status-counts`)

**5. `/today` "Needs you" hero strip** (DERIVE)

- File: `apps/app/src/features/today/NeedsYouStrip.tsx`
- Data: `count(obligations where status IN (waiting_on_client, blocked) AND assignee=me)`
- Pencil ref: `YuFyD` is the standalone integration demo (copy from this); `jnnk0` H9bWy6 is the in-context precedent inside the /today page layout
- Click → `/deadlines?status=waiting_on_client,blocked&owner=me`
- Acceptance: count updates reactively when any status transitions

**6. `/deadlines` Filter-bar aggregate stripe** (DERIVE)

- File: `apps/app/src/features/deadlines/DeadlinesListPage.tsx`
- Insert: a sticky 36px band BELOW the existing filter row, ABOVE the table
- Data: client-side `groupBy(filteredRows, 'status')` (re-derive on filter or status change)
- Visual spec:
  - bg-subtle, height 36, padding [8,20], horizontal gap 16
  - eyebrow `DISTRIBUTION OF ${count} FILTERED` 10pt 700 letterSpacing 0.6 text-muted
  - 6 inline pills: dot + count + label (Not started 8 / Waiting 14 / Blocked 2 / In review 5 / Filed 9 / Completed 27)
  - Click pill → adds that status to the filter (multi-select)
  - Right-side hint: `Click to filter · Right-click for breakdown` text-tertiary 11pt
- Acceptance: stripe re-derives on filter change AND on any visible row's status change

### P1 — 8 surfaces (presentation work)

**7. `/deadlines` Row mini-stripe column** (READ)

- File: `apps/app/src/features/deadlines/columns/StatusColumn.tsx`
- Render: `<ObligationStatusBadge id={row.id} variant="mini-stripe" />`
- Mini-stripe visual: 6 dots 4×4 connected by 1px lines. Past = success-solid filled; current = warning/destructive/accent depending on stage; future = divider-regular
- Status pill stays as the leftmost column; mini-stripe is supplementary
- Acceptance: scanning 60 rows shows stage distribution instantly

**8. `/deadlines/[id]` Tab badges** (DERIVE)

- File: `apps/app/src/features/obligations/queue/ObligationQueueDetailDrawer.tsx` `<TabsTrigger>`
- Compute per tab:
  - Status tab: shows current stage as a small dot before the label
  - Materials tab: shows `4/5` count chip
  - Record tab: shows `✓` when filed or rejected `!` when latest is rejected
  - Audit tab: shows count of last-7-day events
- Acceptance: badges update on every status change AND on materials receipt events

**9. `/clients/[id]` Split-blocked rollup** (DERIVE)

- File: `apps/app/src/features/clients/PortfolioStatusCard.tsx` (new)
- Data: `obligations.list({ clientId })` + classify each `blocked` by `blockedBy.type` (parent obligation = firm-blocking; client-side missing material = client-blocking)
- Visual: stacked horizontal bar partitioning blocked obligations by side
- Pencil ref: `chs0w` is the integration demo
- Acceptance: re-renders when any of this client's obligations transitions to/from `blocked`

**10. `/clients/[id]` Churn-risk chip** (DERIVE)

- Same file as #9; in client header
- Threshold (firm setting, default 14 days): if `maxDays(client_blocking_obligations) > threshold`, show `⚠ Client-blocked > 14d` chip
- Acceptance: chip appears/disappears reactively

**11. `/opportunities` Closed-deadline suppression** (DERIVE)

- File: `apps/app/src/features/opportunities/OpportunitiesPage.tsx`
- Add default filter: hide opportunities tied to obligations in `{filed, completed}` unless toggle "Show closed" is on
- Acceptance: when any obligation transitions to filed/completed, its tied opportunities hide; when it reverts (e.g. IRS rejection), they re-appear

**12. `/audit-log` Status-transition facet** (READ)

- File: `apps/app/src/features/audit-log/AuditLogPage.tsx`
- Add a filter facet `Event type` with option `Status changed` that filters to `event.type = 'status.changed'`
- For each row, render the diff: `Waiting on client → In review` with two `<ObligationStatusBadge variant="dot">` and an arrow
- Acceptance: new events stream into the log as they fire

**13. `/audit-log` Stage timeline view per deadline** (DERIVE)

- File: `apps/app/src/features/audit-log/StageTimelineModal.tsx`
- Triggered from a row's action menu: "View stage timeline →"
- Renders a vertical timeline of every `status.changed` event for that obligation
- Acceptance: timeline is read-only; data is `events.list({ obligationId, type: 'status.changed' })`

**14. `/deadlines/[id]` Auto-unblock banner** (DERIVE)

- File: existing — verify it's wired to the status bus
- Already shipped per memory `project_auto_unblock_destination` — confirm it subscribes to parent obligation status

### P2 — 2 surfaces (sidebar)

**15. Sidebar Deadlines "needs you" red dot** (DERIVE)

- File: `apps/app/src/components/patterns/AppSidebar.tsx`
- Render: red 6×6 dot next to Deadlines nav item when `count > 0` (same query as #5)
- Click Deadlines → routes to `/deadlines?status=waiting_on_client,blocked&owner=me`
- Acceptance: dot appears/disappears reactively

**16. Sidebar Alerts red dot** (DERIVE)

- Same file
- Render: red dot next to Alerts when `unresolvedAlerts.list({ touchingObligations: 'mine' }).length > 0`
- Acceptance: dot updates as alerts resolve

### Surfaces 17-18 (already shipped, verify subscription)

**17. `/deadlines/[id]` Hero status pill** — verify uses `useObligationStatus`
**18. `/deadlines/[id]` Workflow card actions** — verify writes go through `useUpdateObligationStatus`

## Propagation contract — engineering reference

Trigger: `status.changed{id, from, to, at}` event arrives on client

| Subscription key                   | Components to invalidate                                                                                          |
| ---------------------------------- | ----------------------------------------------------------------------------------------------------------------- |
| `obligation:{id}:status`           | Hero pill, workflow card, tab badges, auto-unblock banner, row mini-stripe (anywhere row appears), audit timeline |
| `client:{clientId}:*`              | StatusRollup, split-blocked bar, churn-risk chip                                                                  |
| `today:stage-counts:{userId}`      | Stage heatmap (old + new bucket), "needs you" strip                                                               |
| `filter:{hash}:distribution`       | `/deadlines` filter-bar aggregate stripe (recompute)                                                              |
| `alerts:touching:{obligationId}`   | Affects-status band, alert list row decoration                                                                    |
| `opportunities:by-obligation:{id}` | If `to ∈ {filed, completed}` → hide tied opportunities; if `from ∈ {filed, completed}` → reveal                   |
| `audit:by-obligation:{id}`         | Append event, increment facet count                                                                               |
| `user:{me}:needs-you`              | Sidebar Deadlines dot                                                                                             |

Use TanStack Query's `queryClient.invalidateQueries({ queryKey: [...] })` against each affected key. Group invalidations into a single batched call per event.

## Canonical string table

Centralize in `apps/app/src/features/obligations/i18n.ts`:

```ts
export const STAGE_LABELS = {
  not_started: 'Not started',
  waiting_on_client: 'Waiting on client',
  blocked: 'Blocked',
  in_review: 'In review',
  filed: 'Filed',
  completed: 'Completed',
} as const

export const TRIGGER_PHRASES = {
  materials_received: 'Materials received',
  materials_requested: 'Materials requested',
  sent_to_client_for_review: 'Sent to client for review',
  client_approved: 'Client approved',
  filed_with_agency: 'Filed with agency',
  confirmation_received: 'Confirmation received',
  notice_received: 'Notice received',
  extension_granted: 'Extension granted',
  reassigned: 'Reassigned',
  marked_complete: 'Marked complete',
} as const
```

Pipe through Lingui `<Trans>` per `reference_lingui_plural_i18n_footgun` memory. No inline `i18n._()` calls.

## Migration sequence — 3 phases

### Phase 1 — Status bus (~1 week)

1. Create `apps/app/src/features/obligations/use-obligation-status.ts` — TanStack Query subscription wrapper
2. Create `apps/app/src/features/obligations/components/obligation-status-badge.tsx` — variants pill/dot/mini-stripe/segment
3. Migrate existing status displays to use the new badge component:
   - `/deadlines` row status pill column → variant="pill"
   - `/deadlines/[id]` Hero status pill → variant="pill"
   - `/alerts/[id]` affected-client row → variant="pill"
   - Workflow card current-stage indicator → variant="dot"
4. Wire `useUpdateObligationStatus` and migrate all write paths through it
5. Set up event emitter / SSE channel on server (polling-only acceptable for Phase 1 if SSE infrastructure isn't ready)

**Gate**: Verify no visible regression. Status bus is invisible scaffolding.

### Phase 2 — 6 P0 surfaces (~2 weeks)

Build in this order, each independent once Phase 1 is done:

1. `/today` stage heatmap (XlEte spec) — biggest user value, easy to verify
2. `/today` "needs you" strip — small but high-traffic
3. `/deadlines` filter-bar aggregate stripe — partners' second-most-used filter affordance
4. `/alerts/[id]` Affects-status band — high-stakes loop (resolve alert → propagate)
5. `/alerts/[id]` Resolve action → multi-obligation transition wiring — extends #4
6. `/alerts/[id]` Linked-deadline row pill — quickest of all

**Gate**: User testing shows partners completing the alert-resolve loop without scrolling between pages.

### Phase 3 — 8 P1 + 2 P2 derivations (~2 weeks)

Build in parallel; all read from the bus.

1. `/deadlines` row mini-stripe column
2. `/deadlines/[id]` tab badges
3. `/clients/[id]` split-blocked rollup (requires `/clients/[id]` page; if not built, defer)
4. `/clients/[id]` churn-risk chip
5. `/opportunities` closed-deadline suppression
6. `/audit-log` status-transition facet
7. `/audit-log` stage timeline modal
8. Sidebar Deadlines dot + Alerts dot

## Tests to add

- `use-obligation-status.test.ts` — subscription lifecycle, re-render on event
- `use-update-obligation-status.test.ts` — optimistic update, rollback on error, audit row written
- `predictTransitions.test.ts` — accuracy of alert → obligation mapping
- E2E: alert resolve → 5 obligation transitions → verify all 5 pills update without page reload
- E2E: /today heatmap → click Blocked bar → routes to `/deadlines?status=blocked&owner=me`

## What this brief does NOT cover

- The status taxonomy 10→6 migration (separate, must land before this brief — see `project_status_taxonomy`)
- File storage (Record tab depends on it; see `reference_record_tab_storage_gap`)
- Tab structure changes (locked at 4: Status · Materials · Record · Audit per `project_tab_count_locked`)
- E-signature integration
- Slack notification routing (P3 nice-to-have)

## Where each Pencil reference lives

| Touchpoint                                        | Pencil node                                                                   | What it shows                        |
| ------------------------------------------------- | ----------------------------------------------------------------------------- | ------------------------------------ |
| `/deadlines/[id]` workflow card with advance pill | `csTbj` (UlSXb is the strip; O27GWf is the compact alternative — pick winner) | Active controls + Next Move panel    |
| `/today` stage heatmap                            | `XlEte`                                                                       | 6-bar distribution with callout      |
| `/today` Workflow Status section                  | `jnnk0`                                                                       | 6 stat cards + NeedsYou eyebrow card |
| `/clients/[id]` portfolio rollup                  | `chs0w`                                                                       | Stacked horizontal bar               |
| `/alerts/[id]` apply panel StatusBreakdown        | `DibzZ` body                                                                  | 6 chips + Touching meta line         |
| Compact context band + Now/Next/Blocking          | `O27GWf`                                                                      | 42px context band alternative        |

## Related dev-log + memory

- Memory: `reference_status_propagation_spec` — the 18-touchpoint catalog as design doc
- Memory: `reference_workflow_aggressive_integration` — the philosophy
- Memory: `reference_workflow_state_cascade` — the per-stage wiring
- Memory: `feedback_status_is_observed_not_chosen` — why no generic dropdown
- Memory: `project_tab_count_locked` — tab structure constraint
- Memory: `reference_record_tab_storage_gap` — what's blocked on file storage
- Dev log: `_position-2026-06-09-milestone-strip.md` — the strip critique + integration map

## End of brief

This brief is the contract. Implementing exactly this gives the product reactive status across all 18 surfaces. Skipping the bus (Phase 1) and going directly to surface work is a trap — each surface will reinvent its own subscription and the system will drift.
