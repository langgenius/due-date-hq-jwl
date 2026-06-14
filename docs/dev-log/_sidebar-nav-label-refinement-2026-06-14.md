# Sidebar nav labels — refine from 15px to the 14px body scale

**Date:** 2026-06-14
**Surface:** `packages/ui/src/components/ui/sidebar.tsx` (`sidebarMenuButtonVariants`)

Yuqi: the sidebar text looked "粗糙和'大'" (rough and big) and wanted it more
精致 (refined). The nav labels were `text-nav` (15px / 400) — the product's
single largest non-heading text, and a bespoke size used only here + two other
spots.

## The actual problem: a hierarchy inversion

The rail's intended three tiers were: firm name (anchor) → nav items (quiet) →
group eyebrows (faint). But the sizes had drifted so the nav items (15px)
**out-sized the firm-name anchor** (`text-base`, 14px / 500) sitting directly
above them. The largest text on the rail was the quiet middle tier — which is
exactly what read as "big / rough."

## Change

Nav label `text-nav` (15px) → `text-base` (14px). One line in
`sidebarMenuButtonVariants`.

A `tracking-[-0.006em]` was briefly trialed but **dropped** the same day after a
`/design-critique` pass: the firm-name + user-chip names (also 14px) carry no
letter-spacing, so a sub-pixel negative tracking on the nav alone was a
same-size inconsistency that wasn't earning its keep. All 14px rail text now
shares one tracking rule (`normal`).

Two further refinements landed in the same critique pass:

- **Active weight `font-semibold` (600) → `font-medium` (500).** 400→600 jumped
  two steps and visibly reflowed the label width on activation; the accent color
  - bg tint already signal the current route, so a single 400→500 step is enough
    emphasis with a far smaller width shift.
- **Inventory count badge `text-text-muted` (#98a2b2) → `text-text-tertiary`
  (#676f83).** Muted sat at only ~2.43:1 on the #f6f8fa card (below WCAG AA), so
  the Deadlines / Clients counts were nearly invisible; tertiary is ~4.68:1
  (AA). It now matches the inactive urgent-count tone — intended: "reference vs
  actionable" is carried by the active-route red pill, not a brightness step too
  subtle to decode.

Resulting rail hierarchy (verified via computed styles in the browser):

| Tier               | Token                   | Size / weight / color                 |
| ------------------ | ----------------------- | ------------------------------------- |
| Firm name (anchor) | `text-base font-medium` | 14px / 500 / text-primary             |
| Nav labels         | `text-base font-normal` | 14px / 400 / text-secondary           |
| Nav · active       | `text-base font-medium` | 14px / 500 / text-accent + tint bg    |
| Quick find         | `text-sm`               | 13px / 400 / text-muted               |
| Group eyebrows     | `text-caption-xs`       | 11px / 600 / text-tertiary, uppercase |
| Count badges       | `font-mono` 12px        | text-tertiary (#676f83) both tones    |

Firm name and nav share 14px, but the firm row keeps its 500 weight + square
monogram, so it still anchors above the 400-weight nav — no inversion. Item
height stays h-8; icon stays size-4 / 1.5px stroke; collapsed-rail behavior
untouched (only the label span carries the size).

## Note on `--text-nav`

The 15px `--text-nav` token is NOT removed — it still backs the deadline
navigator rail (`DeadlineNavigatorRail`) and a rules-library panel heading. The
sidebar simply no longer consumes it, so the old "sidebar is the product's sole
15px text" framing no longer applies to the sidebar.

## Verification

Browser computed styles confirm, on the live rail: nav label 14px / 400 /
`normal` tracking / text-secondary; active nav 500 / accent; both count badges
#676f83. No real console errors (transient HMR `useSidebar` warnings during the
edit are a Fast-Refresh artifact of a file that exports both the provider and
the hook — gone on reload). `pnpm check` clean for these files; the one
repo-wide error is a pre-existing wrangler-script type assertion, unrelated.
