# Dev log — sidebar card elevation: stop it smudging into the background (2026-06-09)

The floating sidebar card was disappearing into the page: its `#f6f8fa` fill is
near-white, the work surface behind it is white, and the card's shadow was a
near-invisible `4%` / 2px. Worst in the hover-peek state, where the card overflows
_on top of_ white content with nothing to separate it. UX only, no data changes.
`packages/ui/src/components/ui/sidebar.tsx`.

## Fix

The card now has real elevation + a defined edge:

- **Hairline border** — `border-divider-regular` (12% black) crisps the card's edge
  against the near-white canvas in **every** state (docked and peeked). This is the
  primary fix; the old design was deliberately border-less ("no board"), which is
  what let it smudge.
- **Elevation shadow, stronger when floating over content:**
  - Docked (expanded or collapsed, sitting in the gutter):
    `0 2px 8px rgb(16 24 40 / 0.08)` — a clear soft lift off the white canvas.
  - Peek overlay (`overlayActive = collapsed && hovered`, card overflowing over
    content): `0 16px 40px -8px rgb(16 24 40 / 0.22)` — a prominent floating
    shadow so the peeked panel reads as clearly above the content.
- `transition-[width,box-shadow]` so the shadow ramps up smoothly as the rail peeks
  open (in step with the 300ms width transition).

## Verified

- Docked (Today, expanded): border + `0 2px 8px / 8%` shadow confirmed visually and
  via computed style — the rail is now clearly distinct from the white content.
- Peek: same border + the `overlayActive` branch raises the shadow to the prominent
  floating value. (Real hover-peek can't be triggered in the headless preview, but
  it's a straightforward conditional on the same card.)
