# /clients empty-state hero

Pixel-exact build of the prominent `/clients` empty state against the
canonical Pencil frames (`duedatehq_work.pen`):

- `jQFBx` — /clients empty state (generic hero)
- `T4eNmw` — /clients empty (skipped-import variant)

## Shipped

### `features/clients/ClientsEmptyState.tsx` (net-new)

Full-surface "no clients yet" hero replacing the quiet inline shared
`EmptyState`. Recreates the Pencil `jQFBx` hero card:

- **Integration-logo strip** — six real product logos (TaxDome, Karbon,
  Drake, QuickBooks, UltraTax CS, Lacerte) in 44px tinted tiles, reused
  from the migration wizard's `source-logos` assets, capped by the dark
  52px "DD" destination tile. The canvas drew letter-glyph tiles with
  brand hex; we use the actual logos so brand identity comes from the
  asset, and the tile chrome maps onto neutral tokens
  (`bg-background-section`, `border-divider-regular`).
- **Headline + subtitle** — "Plug in your tools. Walk away with a triage
  list." at `text-[32px]` on wide / `text-2xl` on mobile, supporting copy
  at `text-base`/`text-sm`.
- **CTA pair** — primary "Import clients" + outline "Add one manually"
  (the latter renders only when a create handler is wired and the user
  can create).
- **Outcomes strip** — 4 min · 11 tools · SOC 2, each an icon-chip + value
  - label, divided by hairline rules. (Canvas had the "Nightly auto-sync"
    variant on `T4eNmw`; the two empty frames are two treatments of the same
    hero — we reconciled to one component using the `jQFBx` SOC 2 strip.)
- **Sample-data chip** — accent-tinted pill "Try a 30-second tour with
  sample data" (renders only when an `onSampleData` handler is supplied;
  none is wired today — see below).

Card chrome matches the shared prominent EmptyState family
(`rounded-2xl border border-divider-regular bg-background-default`,
vertically-centered fill column). Fully responsive: tile/CTA/outcome rows
`flex-wrap`, type + padding step down at mobile, hairline dividers hide
under `sm`.

### Wiring

- **`features/clients/ClientFactsWorkspace.tsx`**: the
  `clients.length === 0` branch now renders `ClientsEmptyState` instead of
  the inline `EmptyState`. New optional props `onCreateClient` / `canCreate`
  thread the "Add one manually" affordance through. Removed the now-unused
  `EmptyState` + `UsersRoundIcon` imports.
- **`routes/clients.tsx`**: added a controlled, hidden-trigger
  `CreateClientDialog` driven by the hero's "Add one manually" CTA, gated
  on `client.write` permission. The header's `ClientsCreateSplitButton`
  stays the primary create affordance for the populated directory.

## Reconciliation: `tZ0BB` vs `thUSa`, and the list/detail bodies

The brief mapped five nodes. The two detail treatments (`tZ0BB` primary,
`thUSa` primary+sticky-rail) and the list body (`rOSHx`) are already
shipped as mature, intentionally-evolved surfaces (the current list
deliberately retired the canvas's stat band per
`docs/Design/clients-list-summary-strip-redesign.md`, and the responsive
detail rail is already in `ClientDetailWorkspace`). The canvas list/detail
also lean on data not in the contracts (YTD revenue, onboarding doc
counts, engagement-plan, health score). Per the "preserve wired data /
missing data → TODO" rule, this pass scoped to the empty states — the one
surface that was genuinely a quiet placeholder vs. an elaborate hero.

## TODO(data)

- **Sample-data tour** — the canvas "Try a 30-second tour with sample
  data" chip implies a sample-data onboarding flow that does not exist in
  the app. `ClientsEmptyState` accepts an `onSampleData` prop and only
  renders the chip when supplied; today it is unwired, so the chip is
  hidden. Wire it when the sample-data tour ships.
