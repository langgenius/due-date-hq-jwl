# /alerts ↔ /today consistency — monitoring chip + sidebar header — 2026-06-09

Two `/alerts` page-feedback items from Yuqi, both about matching `/today`.

## 1. Sidebar workspace-identity height → 52px

**File:** `apps/app/src/components/patterns/app-shell.tsx`

The expanded sidebar's top workspace-identity section was `h-[72px]`, taller than
the 52px content header bar, so the seam didn't line up. Pinned the **expanded**
section to `h-[52px]`.

**Collapsed stays `h-[72px]`** — that mode stacks the 32px monogram + 32px
collapse toggle vertically (8px gap = 72px), which can't compress into 52px.
Implemented as `h-[52px] group-data-[collapsed=true]/sidebar:h-[72px]`.

> Note: this re-opens a small expanded/collapsed height delta that a 2026-05-26
> pass had unified at 72px (so the nav seam landed identically in both modes).
> Yuqi's 52px request takes priority for the expanded state (the common case);
> the collapsed rail keeps 72px out of physical necessity.

## 2. Monitoring chip shared between /today and /alerts

**New:** `apps/app/src/features/alerts/components/MonitoringChip.tsx`
**Wired:** `features/dashboard/needs-attention-section.tsx` (/today),
`routes/alerts.tsx` (/alerts).

The two pages had drifted: `/today` rendered a 10px passive ghost `<Badge>` with a
"National policy watch" tooltip; `/alerts` rendered a 13px `<Link>` **with a
trailing chevron** and a source-health tooltip. Yuqi: "should be the same as you
have on today page."

Extracted **one** `<MonitoringChip>` so they can't drift again:

- Canonical visual = `/today`'s: ghost `<Badge size="sm">` (10px, `text-text-secondary`,
  `px-0`), leading success `<PulsingDot>`, label "Monitoring: Federal · 50 States · DC",
  **no chevron**.
- `to?` — when set (`/alerts`), the badge renders as a `<Link>` (cursor-pointer +
  hover-deepen) so it stays the **Sources navigation** affordance (the standalone
  Sources button collapsed into it). Passive (no `to`) on `/today`.
- `tooltip?` — overrides the tooltip body. `/today` uses the default "National
  policy watch" explainer; `/alerts` passes its live **source-health** status. The
  chip LOOKS identical on both; only the hover detail is page-specific.

Net: the trailing chevron is dropped on `/alerts`, font drops 13px → 10px, and
both pages share a single primitive. Logged in
`cross-route-consistency-matrix.md` §0 (Monitoring status chip).

## Verify

- `npx tsgo --noEmit -p apps/app` — clean (removed now-unused `ChevronRightIcon`,
  `PulsingDot`, `Tooltip*` imports from the consumers).
- Live: sidebar expanded header section = 52px; `/alerts` chip = `<a href="/rules/sources">`,
  10px, `text-text-secondary`, 0 chevrons; `/today` chip = `<span>`, 10px,
  cursor-help, 0 chevrons. Visually identical.
