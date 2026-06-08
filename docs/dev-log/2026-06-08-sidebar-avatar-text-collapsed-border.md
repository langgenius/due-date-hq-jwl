# Sidebar — smaller avatar, +1px nav text, no collapsed border (Phase 2)

Date: 2026-06-08

Three Yuqi sidebar asks from the product-wide pass.

- **Smaller company avatar** (`app-shell-nav.tsx`): firm tile `size="lg"` (40px)
  → `size="md"` (32px); firm name `text-base` (16px) → `text-[15px]` to match.
  The 40px tile read as oversized chrome; 32px sits as a tidy brand anchor.
  Collapsed mode unchanged (size-7 / 28px).
- **+1px nav text** (`sidebar.tsx`, `sidebarMenuButtonVariants`): label `text-sm`
  (14px) → `text-[15px]`. Item height stays h-8, icon stays size-4.
- **No side border when collapsed** (`sidebar.tsx`): the inner overlay's
  `border-r` now drops via `group-data-[collapsed=true]/sidebar:border-r-0`, so
  the icons-only rail reads as a clean column with no divider line. Expanded
  mode keeps the 1px border to delineate the warm rail from the white content.

## Verify

Preview @1512×861: computed nav font-size `15px`; expanded overlay border-right
`1px` (collapsed selector drops it). Firm tile renders at 32px. tsgo clean.
