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

Nav label `text-nav` (15px) → `text-base` (14px), plus `tracking-[-0.006em]`
(a hair of negative letter-spacing that crisps the label at 14px without
reading condensed). One line in `sidebarMenuButtonVariants`.

Resulting rail hierarchy (verified via computed styles in the browser):

| Tier | Token | Size / weight / color |
| --- | --- | --- |
| Firm name (anchor) | `text-base font-medium` | 14px / 500 / text-primary |
| Nav labels | `text-base font-normal` | 14px / 400 / text-secondary |
| Quick find | `text-sm` | 13px / 400 / text-muted |
| Group eyebrows | `text-caption-xs` | 11px / 600 / text-tertiary, uppercase |

Firm name and nav are now the same 14px, but the firm row keeps its 500 weight
+ square monogram, so it still anchors above the 400-weight nav — no inversion.
Active nav row still bumps to `font-semibold` + accent (unchanged). Item height
stays h-8; icon stays size-4 / 1.5px stroke; collapsed-rail behavior untouched
(only the label span carries the size).

## Note on `--text-nav`

The 15px `--text-nav` token is NOT removed — it still backs the deadline
navigator rail (`DeadlineNavigatorRail`) and a rules-library panel heading. The
sidebar simply no longer consumes it, so the old "sidebar is the product's sole
15px text" framing no longer applies to the sidebar.

## Verification

Browser computed styles confirm 14px / 400 / -0.084px tracking / text-secondary
on every nav label, with the hierarchy table above. No console errors.
`pnpm check` — the only error is a pre-existing wrangler-script type assertion,
unrelated to this one-line className edit.
