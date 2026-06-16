# Deadlines list: chrome polish — table corner, filter chips, Filters popover (Yuqi)

_2026-06-16_

Yuqi: three rough edges on `/deadlines`, all about cohesion with `/alerts` —
"the details are so bad" (table corner), "displaced" toolbar (active-filter
chips), and tidy the Filters popover. All in `routes/obligations.tsx`.

## 1. Table top-left corner glitch

The table card is `rounded-xl border` but in **full-page** mode it carried no
overflow clip (clip is gated to panel-open, because the column header is a
_page-level_ `position: sticky` and a plain `overflow-hidden` ancestor would
re-scope the sticky to the card). To still round the gray header's top corners,
the `<th>`s rounded themselves (`rounded-tl-xl` / `rounded-tr-xl`). A 12px arc on
the th, nested 1px inside the card's border (whose inner arc is 11px), left a
hairline doubled/clipped curve right in the empty checkbox-header cell.

**Fix:** full-page mode now uses `overflow-clip` on the card. `clip` clips like
`hidden` but does **not** establish a scroll container, so the page-level sticky
header still pins to the page (verified: thead sticks at top=60px after a 500px
scroll). The `<th>` corner radii are removed entirely — the card clips them. th
border-radius is now 0; card is `overflow: clip` @ 12px. Panel-open keeps
`overflow-hidden` (the inner div is the real scroll container there). See the
"sticky-header variant" note added to `docs/Design/table-canonical-style.md`.

## 2. "Displaced" active-filter chips

`ObligationActiveFilterChips` renders inside the `flex flex-wrap` toolbar. The
search/filter cluster is `flex-1` with a `min-w-0` basis-0, so during flex line-
breaking the chips fit on line 1 and the cluster then _grew_ and shoved them to
the far right, after Sort / View — reading as orphaned.

**Fix:** the chip row is now `w-full`, forcing it onto its own line below the
controls (left-aligned, "Clear all" stays a quiet secondary `TextLink`). Bottom
spacing comes from the toolbar's own `pb-3` (dropped the row's duplicate `pb-3`).
It's still inside the sticky filter bar, so `filterBarHeight` already accounts
for it and the table header's sticky offset grows correctly when chips show.

## 3. Tidy the Filters popover

- **Tab row was clipping "Saved views."** Seven dimensions + per-tab icon glyphs
  measured 674px in a 558px sheet, so the 7th tab scrolled off behind a hidden
  scrollbar. Dropped the tab icons (labels are self-explanatory) → 558px, no
  overflow, with slack. Set the strip to `px-1` so the first tab's label lands on
  the header title's 16px inset (verified: both at x=260.6). Removed now-unused
  imports (`MapPinIcon`, `ClockIcon`, `ComponentType`, `SVGProps`).
- **Saved-views padding** aligned to the Condition tab's rhythm: `p-3 → p-4`,
  eyebrow at the section inset, preset rows `-mx-2` so their hover wash breathes
  while the text lines up with the eyebrow.
- **Already correct, left as-is:** the selected pills (Past due / Needs evidence
  …) already use the canonical accent selection via `ToggleChip`
  (`border-state-accent-solid bg-state-accent-hover-alt text-text-accent`); the
  group eyebrows (DUE WINDOW / TRIAGE / PRESETS) already share one treatment; the
  staged-count · Reset · Cancel · Apply footer already reads cleanly. The 95%-
  white `bg-components-panel-bg-blur` bleed-through is the intentional frosted-
  glass panel token, not a bug.

## Also in this commit (not mine)

This commit also carries a pre-existing, uncommitted change that was already in
the working tree: the toolbar **Status** control collapsed from an always-open
pill-strip into a `Status │ All ⌄` FilterTrigger dropdown (comment: 2026-06-16,
Yuqi "too long / usually collapsed"). It's unrelated to the three fixes above;
bundled here per Yuqi's call rather than split into its own commit.

## Verify

All three confirmed live on localhost:5173 @ 1512×861 (screenshots): clean
corner + working sticky header, chips on their own secondary line, popover tabs
fitting/aligned with the Saved-views tab visible. `tsgo --noEmit -p
apps/app/tsconfig.json` clean. Token-discipline check: zero new violations in
`obligations.tsx` (the 4 flagged are pre-existing drift in unrelated files).
Behavior unchanged throughout — visual/layout polish only.
