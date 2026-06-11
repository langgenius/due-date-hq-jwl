# Status-pill + toggle/segmented alignment

Date: 2026-06-10

Yuqi: "align all of the status across the application, the '8 active' (what do
you call this), the toggle and segmented control (are they the same thing?)".

## Naming, for the record

- The "8 active" chip is a **`CountPill`** — a status/count pill (soft fill +
  optional dot + count). Its green sibling "LIVE" is the **`MonitoringChip`**
  (shared /today + /alerts, already aligned).
- **Toggle ≠ Segmented.** `Segmented` = pick **one of 2–3** mutually-exclusive
  options (a pill group). `Switch` = a binary **on/off** setting. Distinct
  primitives, distinct jobs. The drift was ~25 hand-rolled `aria-pressed`
  buttons bypassing both.

## A. Status counts — one tone-aware CountPill

`CountPill` was hardcoded destructive (red). Generalized it into the canonical
title/rail count pill with a `tone` prop — ONE shape, tone = meaning:

- `destructive` (default) — urgent/actionable subset, red dot. "8 active",
  "N overdue". Default keeps the 3 existing call-sites (alerts header + alert/
  deadline rail heads) unchanged.
- `neutral` — plain total/scope count, **no dot**. "28" deadlines, "9" clients.
- `accent` / `warning` — informational / soft-warning counts (available).

Applied to the bare-`Badge` title counts so every page-title count is now the
same primitive:

- `/deadlines` title: `<Badge variant="secondary" size="lg">28</Badge>` →
  `<CountPill tone="neutral">`.
- `/clients` title: same Badge pattern → `<CountPill tone="neutral">`.
- `/rules` has no title count (left); `MonitoringChip` (LIVE) untouched —
  it's a different semantic. Descriptive prose lines ("N handled alerts · last
  90 days", the deadlines "Synced · N tracked" eyebrow) left as prose — they're
  sentences with context, not count chips.

Verified live: deadlines "28" renders neutral fill `#f9fafb` / `text-secondary`
/ no dot, the same pill shape as the red "8 active".

## B. Toggle / segmented

- Added a **`disabled`** prop to the shared `Segmented` (was missing; the
  reminder editor needed it).
- **Killed the duplicate `Segmented`** re-implemented locally in
  `reminder-template-editor-page.tsx` (cadence + trigger-anchor pickers) —
  replaced with the shared primitive (`disabled`, no-op `onValueChange` since
  those fields are unwired/`TODO(data)`).
- **`/preview` theme picker** (Light/Dark/System, was 3 `aria-pressed` Buttons)
  → shared `<Segmented>`.

### Considered but deliberately NOT migrated (would be a downgrade/misfit)

- **`/billing` Monthly/Yearly** — on inspection it's a *deliberately prominent*
  pricing toggle (h-11 track / h-9 items, accent-fill active + shadow, a
  "save %" badge in the Yearly option). The shared Segmented is a small
  toolbar control (h-7 items, flat white-fill active). Migrating would shrink it
  and drop the accent emphasis. Left as an intentional large variant — revisit
  only if we add a Segmented `size="lg"` + accent-active variant.
- **`/alerts` time-range filter** (`TimeRangeFilter` pills) — a *wrapping,
  label-above, accent-bordered filter-pill group*, not a single-track Segmented.
  Closer to the FilterTrigger family. Left as-is.
- Genuine non-Segmented `aria-pressed` uses left alone: sortable table headers,
  map/tilegram state tiles, multi-select coverage/entity filter pills,
  onboarding state multi-select.
- (Step4Preview was flagged by the audit as having a local Segmented — it does
  not; false positive.)

## Verify

tsgo: 0 errors in touched files (the 1 remaining error is `deadline-detail.tsx`,
unrelated WIP). `vp check`: 0 format errors on touched files. Live /deadlines
title count confirmed.
