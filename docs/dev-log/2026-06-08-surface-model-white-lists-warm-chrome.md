# Surface model — white work surface, warm-gray chrome (Phase 0)

Date: 2026-06-08

First phase of the product-wide design unification. Inverts the surface model.

## Before

Body + SidebarInset were a cool `#f7f9fc`; the sidebar painted white
(`components-panel-bg`); white cards layered on the cool gray inset
("paper on a desk").

## After (Yuqi: "primary page white, secondary warm gray, very light")

- `--background-inset` `#f7f9fc` → `#ffffff`. The route work surface — every
  primary/list page — is now **white**. Content delineates via hairline
  borders on white rather than gray fills (restraint on colored-bg + border).
- New `--background-canvas-warm` = `#f6f5f3` — a very-light **warm** gray
  (~3.5% off white, red > green > blue). Used by the **sidebar rail** and,
  later, the **detail/master-detail** surfaces.
- `--background-body` `#f7f9fc` → `#f6f5f3` (warm; mostly hidden behind the rail).
- Sidebar (`sidebar.tsx`, desktop overlay + mobile sheet) switched from
  `bg-components-panel-bg` → `bg-background-canvas-warm`. `panel-bg` is left
  untouched so popovers / dialogs / sheets / command stay white.
- Mapped `--color-background-canvas-warm` in `preset.css`; dark counterpart
  `#1f1d1b` added in `semantic-dark.css`.

Net: a warm-gray rail against a white content surface — the rail reads as its
own column, content reads as the focal plane.

Canonical container radius for the program is `rounded-xl` (12px); the
`rounded-[14px]` / `rounded-[12px]` one-offs get aligned as each component is
touched in later phases.

## Verify

Preview @1512×861: computed inset `rgb(255,255,255)`, rail `rgb(246,245,243)`;
`/today` renders cleanly. The blue Daily Brief + gray alert cards now sit on
white and read as transitional — pulled to white + hairline in Phase 4.
