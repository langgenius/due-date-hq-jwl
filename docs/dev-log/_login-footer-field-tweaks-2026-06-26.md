# Login — footer surface + field icon insets

**Date:** 2026-06-26

Per Yuqi's /login feedback (1512×861):

- **Footer gets its own surface.** It was transparent — same bg as the left sign-in
  panel — so it read as part of that column. Gave it `bg-background-default` (white) +
  `border-t border-divider-subtle` so it's a distinct full-width band, clearly different
  from the `bg-background-subtle` left panel.
- **Field icons further from the edges.** The email field's leading (mail) and trailing
  (return ↵) `InputGroupAddon` insets bumped `pl-2`/`pr-2` → `pl-3.5`/`pr-3.5` (8px →
  14px), so the icons clear the `rounded-xl` (12px) corners and breathe. Override is at
  the login call site only — the shared `InputGroup` primitive is untouched.

## Verify

`pnpm check` 0 errors; `build` clean. Live /login @1512: footer `rgb(255,255,255)` with
1px top border; mail addon `padding-left:14px`, return addon `padding-right:14px`.
