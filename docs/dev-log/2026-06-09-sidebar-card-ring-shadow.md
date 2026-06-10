# Dev log — sidebar card: drop hard border for a soft ring-shadow (2026-06-09)

Follow-up to `346c3d9b` (card elevation + hairline border). That commit fixed the
"smudges into the background" problem but the hard `border-divider-regular` outline
read as an ugly boxed-in card (against the rail's "no board" intent). This refines
the separation to a soft ring-shadow — no hard line. `sidebar.tsx`, UX only.

## Change

The card fill stays the opaque `--background-sidebar-card` (#f6f8fa). Separation now
comes from shadow alone:

- **Docked:** `0 0 0 1px rgb(16 24 40 / 0.04)` (a faint 1px ring that defines every
  edge softly, no hard border) + `0 4px 12px -2px rgb(16 24 40 / 0.10)` lift.
- **Peek overlay** (`overlayActive`, card overflowing over content):
  `0 0 0 1px rgb(16 24 40 / 0.05)` + `0 16px 36px -6px rgb(16 24 40 / 0.18)` — a
  prominent float so it reads clearly above the work surface.

`transition-[width,box-shadow]` so the shadow ramps up as the rail peeks open.

## Glass experiment — tried and reverted

Explored an iOS-26-style frosted-glass treatment (translucent fill + `backdrop-blur`

- `backdrop-saturate`). Reverted: glass needs busy/colorful content behind it to
  register, but the rail only overlaps content during the transient hover-peek, and
  that content is a calm white work surface — so the frost was imperceptible. Making
  it visible would require heavy blur/transparency that degrades nav-text contrast.
  Not a fit for this app's flat, calm aesthetic. No glass code remains.
