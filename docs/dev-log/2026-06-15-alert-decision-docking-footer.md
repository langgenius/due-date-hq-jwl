# Alert detail — decision-card terminus + docking footer (Stage 6)

_2026-06-15_

The committed action bar (audit note + Apply / Mark reviewed / Dismiss / Copy
draft) was a `SheetFooter` pinned *outside* the scroll area — always flush at
the bottom, no relationship to where the reader is in the document. Stage 6
(Yuqi's chosen IA: "single card at bottom; footer floats then docks") turns it
into a decision-card terminus.

## What

- Moved the action bar **inside** the scroll flow as the last child, styled
  `sticky bottom-0 mt-auto`:
  - `mt-auto` pins it to the bottom when the document is short (preserves the
    old always-reachable footer for brief alerts).
  - `sticky bottom-0` makes it **float** over the document while there's more
    to read, then **dock** at the very end on long alerts.
- `decisionDocked` (computed in the existing onScroll — no new listener; reuses
  the same bottom-of-scroll calc as the scroll-spy) toggles an **upward float
  elevation** that's present while floating and removed once docked, so the end
  state reads as a calm terminus rather than a hovering bar. Defaults docked, so
  short alerts never show a phantom shadow; reset per alert.
- The white fill is back (the old footer dropped it as "non-overlapping") since
  the document now scrolls *under* the bar.

## Notes

- The float shadow is an **inline style**, not an arbitrary `shadow-[…]` class —
  tailwind-merge in `cn()` silently drops arbitrary shadows with commas/parens
  (same family of footgun as the custom font-size tokens), so the class version
  never rendered.
- Removed the now-unused `SheetFooter` import.

## Verified

Live (panel mode, 1512×): short alert → bar pinned flush at the bottom; long
alert (viewport shrunk to force overflow) → bar floats with an upward shadow
mid-scroll (document visible underneath) and docks flush at the end, revealing
the last content. Actions intact. tsgo + vp check clean; no new i18n strings.
