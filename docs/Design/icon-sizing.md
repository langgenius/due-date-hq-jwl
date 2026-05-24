# Icon sizing system

> Canonical sizing rules for lucide icons across the app. Pulled
> from a 2026-05-25 audit after Yuqi flagged inconsistent icon
> sizing surface-to-surface. The rules below match what the
> primitives already enforce — so most "rule violations" today
> are dead className declarations on icons inside primitives that
> already force the right size.

## What primitives enforce

These two primitives override icon size with `!important` or with
the "only if not set" pattern, so they're the source of truth for
icons rendered inside them:

| Primitive                           | Selector                               | Forced size     | Overridable?        |
| ----------------------------------- | -------------------------------------- | --------------- | ------------------- |
| `<Badge>`                           | `[&>svg]:size-3!`                      | `size-3` (12px) | NO — `!important`   |
| `<Button>` default                  | `[&_svg:not([class*='size-'])]:size-4` | `size-4` (16px) | YES — pass `size-X` |
| `<Button size="xs">` / `"icon-xs">` | `[&_svg:not([class*='size-'])]:size-3` | `size-3` (12px) | YES                 |

**Consequence:** any `size-3.5` or `size-4` className on an icon
that is a direct `<svg>` child of a `<Badge>` is dead. Don't
write it. The badge primitive will override.

## Free-floating icons (no primitive)

For icons that sit inline in body text or chrome without a Badge
/ Button wrapper, follow the size of the surrounding text:

| Context                              | Icon size            | Pixels  | Example                              |
| ------------------------------------ | -------------------- | ------- | ------------------------------------ |
| `text-caption-xs` / `text-xs` (12px) | `size-3`             | 12px    | Tiny status marks, inline dots       |
| `text-sm` / `text-base` (14-16px)    | `size-3.5`           | 14px    | Inline glyph next to body text       |
| `text-lg` and up (18px+)             | `size-4`             | 16px    | Section-header marks, large captions |
| Decorative / standalone              | `size-5` to `size-8` | 20-32px | Empty-state heroes, dialog headers   |

Pin to these four sizes. Avoid `size-1.5` (6px — too tiny except
for decorative dots), `size-2` (8px), `size-5` (only when text is
genuinely text-lg+).

## When to deviate

- **Large affordance with small text label** (e.g., a 24px hero
  icon above a `text-xs` caption in an empty state): the icon is
  decorative — use `size-6+` regardless of text size.
- **Bare dot indicators** (no glyph, just a colored circle):
  use `size-1.5` or `size-2`. These aren't icons — they're
  primitive shape elements.
- **Lucide glyphs at small sizes lose detail.** If a complex glyph
  (`Hourglass`, `Construction`, `MessageSquareText`) needs to
  render in a `text-xs` context AND the eye needs to recognize
  the shape, bump to `size-3.5` and let the icon be slightly
  taller than the text. The status pills inside obligation
  badges did this until the Badge primitive's `size-3!` rule
  flattened them back — accepting the loss because the label
  text disambiguates anyway.

## Common icon-to-text rules

Beyond size, two patterns worth keeping consistent:

1. **`aria-hidden`** on every decorative icon. If the icon has
   text next to it, the text carries the accessible name; the
   icon is decoration.
2. **`shrink-0`** on icons inside flex rows where the icon must
   stay its native size while siblings can shrink. Without it,
   flex can squash icons in narrow viewports.

## Sort indicators

The `obligations.tsx` queue and the rules library both use the
same sort-indicator vocabulary now:

- Unsorted columns: render NO icon. The hover affordance is the
  label changing color, not an arrow ghost.
- Sorted columns: render a small `ChevronUp` / `ChevronDown`
  (`size-3`, accent color) inline next to the column label.

No more `ArrowUpDownIcon` / `ArrowUpIcon` / `ArrowDownIcon`. The
chevron pair is the canonical sort glyph across the product.

## Anchor

- Implementation:
  - [`packages/ui/src/components/ui/badge.tsx`](../../packages/ui/src/components/ui/badge.tsx)
    line 13 — `[&>svg]:size-3!` rule
  - [`packages/ui/src/components/ui/button.tsx`](../../packages/ui/src/components/ui/button.tsx)
    line 25 — `[&_svg:not([class*='size-'])]:size-4` default
- Sort indicator: [`apps/app/src/routes/obligations.tsx`](../../apps/app/src/routes/obligations.tsx) — `HeaderSortControl`
- Status icon vocabulary (paired with this doc):
  [`obligation-status-icon-vocabulary.md`](./obligation-status-icon-vocabulary.md)
