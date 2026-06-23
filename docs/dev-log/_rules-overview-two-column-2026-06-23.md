# Rule library overview — Coverage map ‖ Where to start (two columns)

**Date:** 2026-06-23
**Surface:** `apps/app/src/routes/rules.library.tsx`,
`apps/app/src/features/rules/RuleCoverageMap.tsx`

The Rule library overview stacked **Coverage map** above **Where to start**, so
the signature tilegram pushed the actionable backlog a full screen down. Yuqi:
put them side by side as peers (left = map, right = where to start) — "same
important level, hence the same title size."

## What changed

- **Two-column split.** The Coverage map and the "Where to start" backlog now
  sit in a `grid` — left track sized to the fixed tilegram (`540px`, = 494px
  grid + card padding), right track `minmax(0,1fr)`. They share a baseline
  (`items-start`) so the two headings line up as siblings.
- **Container query, not a viewport breakpoint.** The split triggers at
  `@4xl` (56rem / 896px) of the *wrapper's own width* via `@container`, because
  the collapsible app sidebar makes viewport breakpoints unreliable for inner
  content width. Below that the two stack full-width. This is the app's first
  use of CQs — verified the utilities emit in the built CSS
  (`@container (width>=56rem){…grid-template-columns:540px minmax(0,1fr)}`).
- **Peer titles.** The Coverage map heading moved from `text-base font-semibold`
  (16px) to `text-region-title` (18px/600) — the exact token "Where to start"
  already uses. "Where to start" promoted from `<span>` to `<h2>` so they're
  true semantic peers.
- **Right-column card grid is container-aware.** "Where to start" is itself a
  `@container`; its jurisdiction cards are `grid-cols-1 @lg:grid-cols-2` so they
  read as a clean ranked column when the right track is narrow and go 2-up once
  it's ≥512px — instead of the old viewport `sm/lg:grid-cols-3` that would have
  crammed 3 columns into the right track.

## Verified

- app tsgo clean · ui tsgo clean · build clean.
- Live (1680px): map left (540px) ‖ where-to-start right (670px), both titles
  18px, aligned tops, cards 2-up.
- Live (820px): stacks — map full width over where-to-start full width, cards
  still 2-up at full width. No console errors.
- No new i18n strings (only a tag/class swap + reorder).

## Note

Yuqi offered "hide the coverage map" as the alternative. The two-column layout
solves the same vertical-space problem without losing the signature view, so
that's what shipped; a hide/collapse toggle was not added.

## Follow-up — subtler coverage map (same day)

Yuqi: "more subtle, just the state name in red and destructive border to show it
needs to be reviewed, not the whole thing red." The tiles were filled with soft
red/amber/green blocks; with a mostly-pending backlog the whole map read red.

- **Status now rides the border, not a fill.** Tiles are white with a neutral
  gray outline; no `bg-*-soft` fills anywhere.
- **Red is reserved for "review first" (high-severity)** — those tiles get
  `border-state-destructive-solid` + a red code. This is the only strong colour
  on the board, so it pops (von-Restorff) — and it mirrors the StatBand, which
  also keeps PENDING neutral and only HIGH-SEVERITY red.
- **The bulk of pending tiles stay neutral** (`border-border` + secondary code);
  their **count** carries "N to review" without painting the map red.
- Removed the red high-severity count bubble (the precise count lives in the
  tooltip + Where-to-start cards). Legend collapsed to **Review first · Tracked ·
  No rules**.
- Note: `state-warning-solid` resolves to a coral/red in this system (not amber),
  and `state-success-border` isn't a defined token — both reasons the old
  3-colour outline idea was dropped in favour of red-or-neutral.

Verify: tsgo + build clean · live — only NY/CA/TX/FED (high-severity) red, the
rest neutral with counts · 1 new i18n string ("Tracked" → 已跟踪), compile
--strict clean.
