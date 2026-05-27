# Page header chip unification pass

## Context

Four sibling top-level pages — `/clients`, `/deadlines`, `/today`,
`/rules/pulse` (Alerts) — all route through the same
`PageHeader` primitive but had quietly diverged on the count-chip
treatment, action-button variants, and the way they surfaced
secondary status. The result was that the same shared component
rendered four visually different headers depending on which page
you landed on.

Yuqi flagged the inconsistency directly:

> "统一这几页的header section — 至少样式要统一， margin padding要舒服统一，
> 颜色字号都要consistent"

A follow-up note from the same session promoted "Monitoring N
sources" from supporting body copy on `/today` and `/rules/pulse`
into the header chip row — the watcher-is-alive signal is the
foundational state of the Alerts surface and belongs in title
real estate, not buried under an empty-state message.

## Audit findings

| Page           | Title chip styling                                                   | Action variants                                  |
| -------------- | -------------------------------------------------------------------- | ------------------------------------------------ |
| `/clients`     | `text-xs font-medium` + grey pill bg, `text-text-secondary` (canon)  | outline "Import history" + filled "New client"   |
| `/deadlines`   | `text-xs font-medium` + grey pill bg, `text-text-secondary` (canon)  | outline "Export" + outline "Calendar sync"       |
| `/today`       | `text-xs font-medium` + grey pill bg, `text-text-secondary` (canon)  | filled "Add deadline" + outline "Import clients" |
| `/rules/pulse` | `text-base font-normal` plain text, `text-text-tertiary`, no pill bg | ghost "Alert history"                            |

Plus: `/rules/pulse` used `items-baseline` (others use
`items-center`), causing the count to sag below the title
baseline whenever alerts existed.

## Change

### Alerts page header (`/rules/pulse`)

`apps/app/src/routes/rules.pulse.tsx`:

- Title chip realigned to canonical pill (`items-center`,
  `text-xs font-medium`, `bg-state-base-hover`, `text-text-secondary`).
- Two chips now render when both signals are meaningful:
  1. **Monitoring chip** (always when sources exist) — pulsing
     green dot + "Monitoring N sources". Sources count is read
     from `usePulseSourceHealthQueryOptions()` filtered through
     the shared `enabledPulseSourceCount` helper, so React Query
     dedupes the request with the source-health banner
     downstream.
  2. **Alert count chip** (only when `> 0`) — destructive-toned
     pill (`bg-state-destructive-hover`, `text-text-destructive`)
     so an active queue reads with appropriate urgency.
- "Alert history" button reverted from `variant="ghost"` →
  `variant="outline"`. Ghost on the light-grey app bg was
  collapsing to icon-only weight; outline matches the sibling
  "Import history" affordance on `/clients`.
- `AlertsAllClearBanner` body copy shortened from
  "All clear. We're watching official federal and state sources
  (N sources); new matches will appear here." → "All clear. New
  matches will appear here." The source count is now in the
  header chip; restating it in the banner was redundant chrome.
- Dead `enabledSourceCount` wrapper function and its
  `enabledPulseSourceCount` import removed from
  `AlertsListPage.tsx` after the banner stopped consuming the count.

### Today Alerts card section header

`apps/app/src/features/dashboard/needs-attention-section.tsx`:

- Section h2 row gets the same dual-chip treatment, scaled for
  the smaller `text-lg` h2 context. The existing alert-count
  chip (was `text-sm font-normal text-text-tertiary` bare text)
  was also lifted to the canonical pill pattern.
- `AlertsEmptyState` body refactor: the healthy-state
  Binoculars + "Monitoring N sources. New matches will appear
  here. · View sources" paragraph was dropped because the same
  count is now in the h2's chip. The paused-state warning and
  the "no sources monitored at all" branch were retained — those
  states are NOT surfaced by the chip and carry independent
  meaning. The loading branch was also retained so users see
  "Checking…" before the chip flickers in.

### Decision rules captured

(See updated `docs/Design/page-family-canonical.md` §3.)

1. **Action variant**: outline for secondary / navigation
   actions; filled primary reserved for genuine creation
   surfaces (`/clients` "New client", `/today` "Add deadline").
   Non-creation pages (`/deadlines`, `/rules/pulse`) stay
   outline-only.
2. **Chip dual-display**: when a page has both a primary count
   and a foundational status signal, both render as separate
   chips on the same row. Count chip uses the canonical grey
   pill; status chip uses the same pill shape with a leading
   PulsingDot.
3. **Body copy demotion**: if a status signal lands in the
   header chip row, its restatement in supporting body copy
   should be removed (not duplicated).

## Validation

- `pnpm vp check` → **0 errors**, 6 pre-existing unrelated warnings
- Vite dev server boots cleanly on port 5188; no HMR / compile errors
- All new imports trace to existing exports (`PulsingDot`,
  `enabledPulseSourceCount`, `usePulseSourceHealthQueryOptions`,
  `Plural` from lingui macro)
- Visual / authenticated walkthrough of the four pages was not
  performed in this session — local wrangler on :8787 belongs to
  a different worktree and the demo-login flow 500s against this
  worktree's code. The changes are surgical pattern-matches to
  existing canonical chip implementations on `/clients`,
  `/deadlines`, `/today`, so structural correctness is high
  confidence, but the next person touching this should do an
  authenticated four-page walkthrough as soon as practical.

## Files touched

- `apps/app/src/routes/rules.pulse.tsx`
- `apps/app/src/features/pulse/AlertsListPage.tsx`
- `apps/app/src/features/dashboard/needs-attention-section.tsx`
- `docs/Design/page-family-canonical.md` (§3 PageHeader — dual
  chip pattern + primary CTA exception)
