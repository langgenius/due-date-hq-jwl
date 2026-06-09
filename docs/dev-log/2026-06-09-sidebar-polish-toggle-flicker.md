# Dev log — sidebar polish: icons, badges, monogram, collapse handle, flicker fix (2026-06-09)

Follow-up polish round on the floating-card sidebar (after `14d30b92 feat(sidebar):
floating-card parity`). All UX polish — no contract or data changes. Verified live
in the dev preview (computed values checked via DOM, not just eyeballed).

Touches `packages/ui/src/components/ui/sidebar.tsx`,
`apps/app/src/components/patterns/app-shell-nav.tsx`, and
`apps/app/src/features/obligations/AssigneeAvatar.tsx`.

## Nav rows (`sidebar.tsx`)

- **Icons 18px → 16px** (`size-4`) — a step quieter against the 15px labels.
- **End count badges 10px → 11px, weight 600 → 500** (`text-[11px] font-medium`).
  The counts (Alerts 8, Deadlines 15, Rule library 456, Clients 10) read a touch
  larger and lighter. Tone logic unchanged (urgent flips red only on the active
  route; inventory stays neutral).

## Company monogram (`AssigneeAvatar.tsx`, `type='firm'` branch only)

- Corner **`rounded-md` (6px) → `rounded-lg` (8px)** and a faint **`border-white/15`**
  hairline — the dark tile reads slightly softer / lifted against the rail. Scoped
  to firm monograms; client/human avatars untouched.

## Collapse handle (`SidebarCollapseToggle` in `sidebar.tsx`)

- **No border, no shadow** — just the white fill, so it reads as a quiet handle
  rather than a floating control.
- **Half-overlaps the rail**: moved from `right-0` (centered on the aside edge,
  sitting in the gutter) to `right-3`, so its center lands on the card's right
  edge and the circle straddles the boundary.

## Sidebar width

- `SIDEBAR_WIDTH` **280px → 264px** (`17.5rem → 16.5rem`). Collapsed width and the
  card-inset math scale off the same constant, so no other change needed.

## Firm-switcher collapse flicker (`app-shell-nav.tsx`)

The brand row jumped during the collapse animation: the button was 40px tall
expanded (`p-1` + border around the 32px monogram) but snapped to `size-8` (32px)
collapsed, and `mx-auto` re-centered it — so the company avatar moved.

Fix: the button now keeps a **fixed `h-10` (40px) in both modes**, and collapsing
only swaps the border to **`border-transparent`** (the 1px box layout is preserved,
so nothing reflows) while the name + chevron hide via their own
`group-collapsed:hidden`. Removed the `size-8` / `mx-auto` / `justify-center` /
`border-0` / `p-0` collapse overrides.

Result — monogram bounding box is **identical** expanded vs collapsed:
`x=27, y=38, 32×32` in both. Zero movement → no flick.
