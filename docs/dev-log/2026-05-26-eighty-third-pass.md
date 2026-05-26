# 2026-05-26 — Eighty-third pass: Stripe Phase A/B re-application + per-row ⋯

## Context

Picking up from the seventy-ninth → eighty-second passes that
shipped the Stripe-level critique work in stages. After the user
directive "address all of the items i have listed" overrode the
mid-session revert of Stripe Phase A content additions, this pass
re-applies the items I'd peeled back, then lands the Phase B
per-row ⋯ menu primitive across all three table surfaces.

Critique reference: `docs/Design/stripe-level-critique-2026-05-26.md`
(§S2 per-row ⋯, §S3 info banner, §S5 quiet em-dash).

## Re-applied from earlier revert

### InfoBanner mounted on /clients + /clients/[id]

`apps/app/src/routes/clients.tsx` — when the directory is sparse
(fewer than five clients on file) the slim h-12 strip surfaces an
Import-from-CSV tip with a lightbulb icon and an Import CTA that
opens the existing wizard. Gated on `canRunMigration` so firms
without the import permission see the tip without the dead button.

`apps/app/src/features/clients/ClientFactsWorkspace.tsx` — same
primitive on the detail page; renders when the client's readiness
is `needs_facts` and offers "Add filing state" as the inline CTA
(opens the same `FixNeedsFactsSheet` the workspace already wires
to the missing-facts chip).

Both banners use `dismissKey` so a CPA who's read the tip never
sees it again on subsequent visits.

### Open=0 em-dash on the /clients list

The `openObligations` column was rendering literal `0` for clients
with no open deadlines. Restored to the canonical em-dash via
`<EmptyCellMark label={t`No open deadlines`} />` so the eye glides
past zero rows the way Stripe's transaction tables do.

## New in this pass

### `RowActionsMenu` primitive

`apps/app/src/components/patterns/row-actions-menu.tsx` — the
canonical per-row ⋯ surface. Stripe's Transaction table exposes
every row's common actions through a single trailing kebab; this
primitive centralizes that pattern so every table in the app
inherits it identically.

Key shape decisions:

- **Hover-reveal default.** Trigger is `opacity-0` until the row
  hovers, focuses, or the menu opens. `alwaysVisible` opts out for
  dense tables where the affordance must be obvious at rest.
- **Row-click defense.** The trigger calls `stopPropagation` on
  click and on every non-Escape key. Every row in the app uses
  click-anywhere-opens-detail; without this guard the ⋯ swallows
  into "open row" and the menu never appears.
- **Group token.** Selectors key off `group/row` rather than the
  unnamed `group` — multiple `group` parents inside a row would
  fight for the same `group-hover` selector otherwise.
- **Destructive variant.** Items pass `destructive: true` and the
  primitive routes through the existing `DropdownMenuItem
variant="destructive"` path; no hand-rolled red className.

### Per-row ⋯ wired on three surfaces

`/clients` list — new `rowActions` column at the trailing edge.
Items: Open detail, Quick peek (opens drawer), Copy link (writes
the absolute detail URL to clipboard). Replaces the previous "you
have to ⌘-click for the drawer" power-user secret with a real
discoverable affordance.

`/clients/[id]` filing-plan rows — ⋯ rides at the trailing edge of
each obligation row inside `FilingPlanYearSection`. Items: Open
obligation, View in Deadlines (pre-filtered to this obligation),
Copy obligation ID. The status pill + form-code button already
cover primary actions; this menu exposes diagnostic + navigation
paths that previously required URL editing.

`/rules/library` rule rows — ⋯ joins the trailing chevron in both
the grouped `RuleTableRow` and the search results `RuleTableRow`.
Items: Open rule, Copy rule ID, Copy link. Same pattern as the
two surfaces above for cross-surface muscle memory.

### `min-h-14` on filing-plan rows

`FilingPlanYearSection`'s obligation rows were `py-2` (~36px
total). Bumped to `min-h-14` (56px) so the filing-plan grid
carries the same scan density as the /clients list (h-14) and
/rules/library (h-14). Resolves the "filing plan feels squeezed
next to the rest of the family" critique note.

## Structural side effects

- `handleOpenClientDetail` hoisted above the `columns` useMemo in
  `ClientFactsWorkspace.tsx`. The rowActions column references it
  in its deps array, which is evaluated each render before the
  original (post-useReactTable) declaration would have run. TDZ
  ReferenceError averted.
- `/clients` list row dropped the unnamed `group` for `group/row`
  to match the new primitive's selector convention. The existing
  pattern relied solely on `hover:` selectors on the row itself —
  no nested `group-hover` className existed there, so the rename
  is cosmetic for that surface.
- `RuleTableRow` (and the search variant) similarly migrated to
  `group/row`. The existing `group-hover:underline` on the rule
  title and `group-hover:opacity-100` on the chevron were renamed
  to `group-hover/row:` so they still react to the same row.

## Files touched

- `apps/app/src/components/patterns/row-actions-menu.tsx` (new)
- `apps/app/src/routes/clients.tsx`
- `apps/app/src/features/clients/ClientFactsWorkspace.tsx`
- `apps/app/src/routes/rules.library.tsx`

## Verification

- `pnpm exec vp lint` — 0 warnings, 0 errors across the four files.
- `pnpm exec tsc --noEmit` from `apps/app/` — clean.

Browser verification deferred — preview-server auth state still
needs interaction (per the eighty-second pass note); the dev SSO
flow blocks headless screenshotting.

## Expected impact

The Stripe-level critique scored the family ~23-26/40 before this
work. With Phase A (info banners + bolder tabs + em-dash + h-14
density) AND Phase B (per-row ⋯ × 3 surfaces) both shipped, the
trio of surfaces (/clients, /clients/[id], /rules/library) now
carries the canonical Stripe row affordance contract. Expected
score after this pass: ~32-34/40.

Deferred to future passes:

- Stripe S4 — filter chip row with `+` prefix (still in worktree
  branch `design/stripe-bar-restyles-2026-05-26` — needs merge).
- Stripe S9 — status pill green-tint + checkmark icon (same).
- Stripe S14 — multi-color stacked progress bar (same).
