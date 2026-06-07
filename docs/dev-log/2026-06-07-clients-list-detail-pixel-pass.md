# Clients list + detail pixel pass (Pencil rOSHx / tZ0BB / thUSa)

Date: 2026-06-07

Completes the Clients pixel pass that the empty-state hero work deferred:
the list directory and the client detail. Additive visual restyle —
all wired data, handlers, and behavior preserved.

## List — KPI stats strip (Pencil rOSHx)

Added `ClientsKpiStrip` above the filter toolbar in
`ClientFactsWorkspace.tsx`: one bordered, rounded card with five
label / value / caption columns separated by vertical hairlines,
mirroring the canvas `ClientsStats` frame.

- **Total clients** — live (`clients.length`); caption flips to
  "N need setup" (warning) when `needsFacts > 0`, else "All set up".
- **Active obligations** — live, summed from `openCount` across the
  obligation summaries; caption "across N jurisdictions" from
  `statesCovered`.
- **At risk** — live: clients with ≥1 open deadline past its next-due
  date.
- **YTD revenue** — TODO(data): retainer / revenue not in
  `ClientPublic`. Static `$284K` / `+18% YoY` per canvas.
- **Onboarding** — TODO(data): onboarding doc counts not in contracts.
  Static `2 docs pending` per canvas.

Hidden on the empty-state surface (`clients.length === 0`).
Responsive: columns stack on narrow, hairline dividers hidden below
`sm`.

## Detail — persistent right rail (Pencil tZ0BB + thUSa)

Reconciled both detail nodes (`tZ0BB` primary layout, `thUSa` alt) into
ONE responsive surface in `ClientDetailWorkspace.tsx`. The existing
`aside` slot — which previously only mounted the obligation slide-in
panel — now hosts a persistent `ClientDetailRail` at rest:

- xl+: fixed 320px rail beside the primary column (Pencil RightRail
  width); swaps to the 60% obligation panel when a filing row is
  selected (prior slide-in behavior preserved exactly).
- below xl: rail stacks full-width under the primary column.

Three cards, matching the canvas (14px radius, 18px padding, uppercase
mono section labels):

- **Snapshot** — Open deadlines = live (`workPlan.openCount`); Filed
  YTD / Outstanding tasks / Last filed are TODO(data) (no YTD-filed
  count, task count, or last-filed event in contracts) → static
  fallbacks per canvas.
- **Engagement** — type / letter-signed / retainer / renews are all
  TODO(data) (engagement-plan + retainer not in `ClientPublic`) →
  static fallbacks + "View engagement letter" link.
- **Contacts** — live primary contact + email via
  `buildClientHeaderContactItems` when present; static sample list
  (Hudson & Wells contacts) otherwise.

## Pixel compromise

The canvas detail header shows a static brand-tile + meta strip + Edit
button. The shipped header was kept as-is: it carries the
`ClientTitleSwitcher` (dropdown client switcher), `ClientCycleArrows`
(prev/next 1/N pagination), and the needs-facts affordance — all
load-bearing behavior the static canvas header lacks. Restyling to the
flat canvas header would have required dropping those interactions,
which the brief forbids.

## Verification

- `npx tsgo --noEmit -p apps/app` → 0 errors.
- `pnpm --dir apps/app test -- src/features/clients src/routes/clients --run`
  → 34 passed.
- `npx vp check` → 0 errors.
