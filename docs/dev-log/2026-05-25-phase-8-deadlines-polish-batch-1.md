# 2026-05-25 — Phase 8 (batch 1): Deadlines polish — filters, drawer header, badges

## Why

Phase 8 of Yuqi's 89-item review — Deadlines (`/deadlines`) had 30
flagged items. Far too many to land in a single commit. This is
batch 1: high-impact, low-risk polish that's all CSS / token
swaps. Future batches will tackle the more structural items
(rounded table corners with proper clipping, scrollbar style,
status color audit, etc.).

## Shipped (5 items)

### Deadlines #1 — Filter spacing

The status scope tabs (`All / In review / Blocked / …`) had
`px-2 py-2` — visually too tight. Bumped to `px-3 py-2.5` so the
active underline + count sit with room to breathe.

### Deadlines #20 — "Missed" not all-caps

The `t\`Missed\``literal was rendering as MISSED because the
wrapper carried`uppercase tracking-[0.06em]`. Dropped both
classes; the red destructive color is the semantic carrier — the
all-caps was just visual shouting.

### Deadlines #18, #19, #21 — Primary deadline strip typography

The drawer's three-column deadline strip (Internal / Filing /
Payment) had:

- Column label at `text-caption` (11px) — too small for a column
  header.
- Date value at `text-sm` (14px) — too small to anchor each column.

Promoted to `text-xs uppercase tracking-wide` for the label
(matches the eyebrow pattern elsewhere) and `text-base` (16px)
for the value. Reads as a real column chip now.

### Deadlines #14 — Drawer h2 (form code)

`Form 1120-S` title was `text-lg` (18px). Drawer h2's compete with
the section headings inside the body at `text-lg`; the drawer
title needs to be the heaviest text on the surface. Promoted to
`text-xl` (20px).

### Deadlines #15 — Drawer meta subtitle

The `FED · Tax Year 2026 · 2025-01-01 — 2025-12-31` meta line was
`text-xs` (12px) — sub-visible next to the now-`text-xl` form
code. Promoted to `text-sm` (14px). Reads as a real subtitle.

## Deferred (with rationale)

### Deadlines #2 — Search button more dominant

Could be a bg icon button. Want to look at the queue's other
"icon-button vs ghost-button" treatments before changing one in
isolation — there's a header-action-icon convention worth
preserving.

### Deadlines #3, #4 — Table rounded corners + row spacing

The Table primitive in `packages/ui` controls these. Changes
would propagate to every table in the app. Needs a design system
discussion before doing it as a one-off here.

### Deadlines #5, #6, #7, #8, #10, #11 — Row content + status visual

These all touch the obligation row's column rendering: status
pill vs internal-due badge collision (#7), red overload on
blocked/rejected (#8), same color across two statuses (#10),
client + deadline + internal-due three-column behaviour when
drawer open (#11), client-with-multiple-deadlines grouping (#6),
typography (#5). Each is non-trivial; the cluster needs a
focused commit (or a separate row-redesign pass) rather than
piecemeal CSS swaps.

### Deadlines #9, #12, #13 — Sticky filters, scrollbar styling

Real layout / browser-default-override work. Out of scope for
batch 1.

### Deadlines #16, #17 — Drawer alignment + top margin

Spacing pass — needs viewport inspection.

### Deadlines #22, #23, #24, #25, #26 — PathToFilingSummary internals

Pipeline progress visual. Yuqi flagged five things in one
component; needs a focused refactor rather than scattered token
tweaks.

### Deadlines #27, #28, #29 — ActiveStageDetailCard typography

Already partially addressed in Phase 4 (#27 stage title bumped
text-sm → text-base, #28/#29 Steps eyebrow + items). Remaining
items in this cluster need another look.

### Deadlines #30 — Summary tab

New tab + content surface. Real structural change. Deserves its
own commit + design doc update.

## Verification

- `pnpm exec tsc --noEmit` clean
- `vp lint apps/app/src/routes/obligations.tsx` 0/0

## Closes Yuqi review items

- Deadlines: **#1, #14, #15, #18, #19, #20, #21** (5 unique items
  — #18/#19/#21 are the same deadline-strip cluster)

Combined with Phases 1-7 (44 items), the review is at **49 / 89**.

Remaining Deadlines items (~22) tracked above as deferred batches.
