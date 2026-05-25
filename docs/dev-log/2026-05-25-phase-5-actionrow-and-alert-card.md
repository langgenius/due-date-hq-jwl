# 2026-05-25 — Phase 5: ActionRow content + alert card clarity (4 items)

## Why

Phase 5 of Yuqi's 89-item review — remaining Today-page items
clustered around the dashboard ActionRow + NeedsAttentionCard.
Phase 4 already closed #25 (client-name dominance); these are the
final four.

## What changed

### #26 — Action prompt copy rewrite

`actionPromptFor()` returned strings like "Complete CPA review and
close the row" — "close the row" is engineering-speak, not what a
CPA puts in their to-do list. The six prompts rewritten:

| Condition                      | Old                                                | New                                               |
| ------------------------------ | -------------------------------------------------- | ------------------------------------------------- |
| `status === waiting_on_client` | Follow up for client materials                     | Follow up with the client for documents           |
| `evidenceCount === 0`          | Attach a source before review                      | Attach the source document                        |
| `status === review`            | Complete CPA review and close the row              | Review the prepared return and sign off           |
| `days <= 0`                    | Confirm filing or payment status today             | Confirm filing or payment status — due today      |
| `days <= 2`                    | Verify owner, source, and filing cutoff            | Final-check owner, source, and cutoff date        |
| default                        | Open evidence and confirm the source still matches | Re-verify the source still applies to this return |

Also moved the function to take `t` as a parameter so the strings
flow through Lingui's extractor (they were previously raw English
literals, leaking into the only-EN UI).

### #27 — Sort order surfaced inline

`SectionHeader` for "Actions this week" gained an inline caption
"· sorted by priority" at `text-caption` weight. The list has
always been sorted by Smart Priority descending; the caption makes
that implicit ordering legible without adding a sort control to a
curated dashboard list.

### #46 — Hover-expand uses a real animation

`ActionRow`'s expansion was a hard mount/unmount — jarring on
hover. Wrapped in a `grid-template-rows` animation: collapsed =
`grid-rows-[0fr]`, expanded = `grid-rows-[1fr]`. The inner content
stays mounted so CSS has a target to animate to; `overflow-hidden`
clips the panel during transit. 200ms ease-out. `motion-reduce`
falls back to instant. Also gates `tabIndex` / `onClick` on
`expanded` so collapsed-but-mounted content isn't focusable.

### #47 — NeedsAttentionCard click destination

Yuqi asked whether the card should open a drawer in-place or
navigate to `/rules/pulse`. **Current behaviour was already the
right answer** — `usePulseDrawer().openDrawer()` opens the same
drawer that mounts on `/rules/pulse`, in-place on the dashboard.

Two visible improvements so the user can tell that's what'll
happen:

- Added a comment block justifying the in-place drawer choice
  (list-driven review, consistent with obligation / client
  drawers, overflow tile correctly DOES navigate).
- aria-label tightened: "Review Pulse alert: X" → "Open Pulse
  alert details: X".
- Chevron hover translation bumped `group-hover:translate-x-0.5`
  → `group-hover:translate-x-1` with a `duration-200` so the
  hover feels deliberate.

## Verification

- `pnpm exec tsc --noEmit` clean
- `vp lint apps/app/src/features/dashboard` 0/0 (6 files)

## Closes Yuqi review items

- Today: **#26, #27, #46, #47** (4 items)

Combined with Phases 1-4 (32 items), the review is at **36 / 89**.

## Note

No design doc update needed for this commit — the changes are all
surface-level copy / animation / hover-feedback tweaks that follow
existing patterns documented in
`docs/Design/dashboard-actions-design-brief.md` (Phase 3 already
updated that doc with the merged-section layout) and the
typography ladder added in Phase 4. The drawer-vs-route choice for
the NeedsAttentionCard click destination is documented in the
PulseDetailDrawer comment per pulse-vocabulary.md's earlier
addendum.
