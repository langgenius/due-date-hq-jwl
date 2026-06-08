# Sidebar nav text → 14px (Yuqi "smaller 1px")

Date: 2026-06-08

Yuqi reverted the earlier +1px nav bump after seeing it: menu-item label
`text-[15px]` → `text-sm` (14px) in `sidebarMenuButtonVariants`. Item height
(h-8) and icon size (size-4) unchanged.

(Companion tweak — the /today alert-card title `text-[15px]` → `text-[14px]` in
`needs-attention-card.tsx` — applied on disk but not committed here: that file is
owned by a concurrent rewrite in another session.)
