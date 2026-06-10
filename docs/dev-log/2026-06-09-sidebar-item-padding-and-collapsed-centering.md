# Dev log — sidebar item padding + collapsed-rail icon centering (2026-06-09)

Two small UX fixes to the sidebar rows. No data changes. Files: `sidebar.tsx`,
`app-shell-nav.tsx`, `app-shell-user-menu.tsx`.

## 1. Bigger nav item left/right padding

Nav item horizontal padding `9px → 11px` (`px-[9px]` → `px-[11px]`) for a touch
more breathing room around the icon/label and the active pill.

## 2. Center the icons in the collapsed rail

In the collapsed icon rail the glyphs sat left-aligned at the item padding, ~3px
left of the rail centerline (measured: nav icons center-x `41` vs card center `44`;
search `42`, footer avatar `42`). They read as off-center.

Fix: in collapsed mode (`group-data-[collapsed=true]/sidebar`) the nav button,
the quick-find button, and the user-menu (footer) trigger now `justify-center` +
`gap-0`, so the lone glyph sits on the rail's centerline instead of left-aligned.

Verified on a clean collapsed page: all 8 nav icons now measure center-x `44.0` =
card center `44.0`; search icon and footer avatar align to the same center.

The brand monogram is left as-is: it's a 32px tile already centered to within 1px
(`43` vs `44`) and matching its expanded position, so centering it would re-
introduce the collapse flicker the fixed-height fix removed.
