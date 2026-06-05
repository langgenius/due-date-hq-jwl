# 2026-06-05 — Dashboard Daily Brief card (surface `dashboard.load.brief`)

Backend↔UI gap audit (see `docs/Design/backend-ui-gap-specs-2026-06-05.md`)
found that `dashboard.load` already returns a server-generated AI
`brief` (`DashboardBriefPublic`: status / text / citations / freshness)
but `routes/dashboard.tsx` never read it, and the refresh mutation
`dashboard.requestBriefRefresh` was unused. This wires the first slice —
the highest-value "finished backend, zero UI" item.

## Changes

### `apps/app/src/features/dashboard/daily-brief-card.tsx` (new)

`<DailyBriefCard>` — renders the brief above the actions list.

- **Null-safe:** returns `null` when `brief == null` (feature-off firms).
- **Status → chrome** via `BriefFreshnessChip`: `ready` → "Updated
  {relative}"; `stale` → amber "Outdated"; `pending` → spinner
  "Generating…" + 3-line `Skeleton`; `failed` → destructive "Couldn't
  generate" with `errorCode` in a Tooltip.
- **Citations** via `BriefProse`: splits `text` on `[n]` markers and
  resolves each against `brief.citations` (`ref → obligationId`). A match
  renders a clickable chip → `onOpenObligation(obligationId)`; hover shows
  `evidence.sourceType` + a "View source" `TextLink` when `sourceUrl` is
  present. Unmatched `[n]` fall back to plain text (no dead chips).
- **`BriefScopeToggle`** — `firm | me` segmented control.

### `apps/app/src/routes/dashboard.tsx`

- New nuqs param `brief` (`firm`|`me`, default `firm`, replace-history) so
  scope survives refresh and is shareable; threaded into the load input as
  `briefScope`.
- `requestBriefRefresh` mutation wired (invalidates `dashboard.load` on
  success; toast on error).
- `dashboardQuery` gains `refetchInterval` that polls every 4s **only**
  while `brief.status === 'pending'`, so the card flips to the narrative
  without a manual refresh.
- Card mounted after the error `Alert`, before `<NeedsAttentionSection/>`;
  citation clicks route through the existing `openObligationDrawer`.

## Verification

- `tsc -p apps/app/tsconfig.json --noEmit` → 0 errors.
- Live preview (`app-5173`, E2E fixture): `/` renders, no console errors
  attributable to the card; `dashboard.load` returns `brief: null` for the
  E2E firm (the seeded briefs in `mock/demo.sql` belong to the demo firms
  `mock_firm_*`, dated 2026-06-02), so the card correctly renders nothing.
  Populated-state visual proof needs a firm with a current-dated brief.

## Follow-ups (tracked in `docs/Design/placement-map-and-amendment-prompts-2026-06-05.md`)

Remaining gap-audit items have dispatch-ready prompts in the placement map:
exposure readout, priority triage, source health/coverage, rule
reject/archive, saved views, etc.
