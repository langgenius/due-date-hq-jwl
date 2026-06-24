# Radius / type tokens + clients invalidation + font-weight — 2026-06-24

## What changed

### panels.tsx — InternalVsFilingSchematic
- `rounded-md` → `rounded-lg` (8px, table/chip scale per radius canon)
- `text-[10px]` → `text-caption-xs` (named token) on all three label divs
- `text-white/55`, `text-white/60`, `text-white/45` → `text-text-inverted/{55|60|45}` (semantic token)
- `text-white` → `text-text-inverted` on date values
- Buffer annotation bottom: same `text-[10px]` → `text-caption-xs` + `text-white/55` → `text-text-inverted/55`

### ObligationQueueDetailDrawer.tsx
- **Dead-code removal**: dropped the entire `deadlineTipRefresh` useState + `activeDeadlineTipRefresh` + `requestDeadlineTipMutation` + `deadlineTipQuery` + derived computed block (`deadlineTipInsight`, `deadlineTipGeneratedAtMs`, `deadlineTipLatestRefreshSettled`, `deadlineTipRefreshTimedOut`, `deadlineTipPreparing`, `void deadlineTipPreparing`). The Risk tab that owned this surface was retired; the pipeline was only computing and immediately voiding. Removed import of `DEADLINE_TIP_REFRESH_POLL_INTERVAL_MS` and `DEADLINE_TIP_REFRESH_TIMEOUT_MS`.
- **Dead code — invalidateDetail**: removed `orpc.obligations.getDeadlineTip.key()` invalidation (query no longer exists in this component).
- **Client invalidation (connection fix)**: `invalidateDetail()` now also invalidates `orpc.clients.listByFirm.key()` and `orpc.clients.get.key()` so the /clients at-risk flag + client detail page reflect obligation status changes immediately.
- **Breadcrumb height**: `h-[44px]` → `h-11` (Tailwind spacing token, identical 44px value).
- **Font-weight sweep — data values**: extension history year (`font-mono text-sm`) and result (`text-xs`) demoted `font-semibold` → `font-medium`; evidence progress fraction demoted `font-semibold` → `font-medium`.
- **SECTION_META risk stub**: kept required by `Record<ObligationQueueDetailTab, …>` exhaustiveness — comment explains it is a type-only stub that never renders (filtered out at sectionNavItems).

### workload-page.tsx
- **Busiest-owner insight** (capacity pressure tile): replaced flat template string `"name · N · score% load"` with a two-line layout — owner name on one line (font-medium, truncate), open count + load score as a `text-caption-xs text-text-secondary` sub-line.
- **Owner-row icon**: `ClipboardListIcon` (task list — wrong for a person row) → `UserRoundIcon`; added to lucide import.
- **Font-weight sweep**: `ManagerInsightMetric` value `<p>` demoted `font-semibold` → `font-medium` (data value, not a title).

## DEFERRED
- **ManagerInsightMetric → StatBand fold (target 8)**: StatBand is a full-width `border-y` band intended for table summary rows. ManagerInsightMetric tiles live inside a `CardContent` grid and carry bordered card chrome that StatBand doesn't provide. A migration would require StatBand to support card-container mode — NEEDS CENTRAL CHANGE to packages/ui stat-band.tsx.
- **`risk` SECTION_META entry**: cannot remove without removing `'risk'` from the `ObligationQueueDetailTab` union type (shared type, not in obligations/ feature scope). The `filter((tab) => tab !== 'risk')` call already prevents it from rendering.
