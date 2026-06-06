# Client title switcher option readability

**Date:** 2026-06-06
**Surface:** `/clients/[id]`

## Change

Fixed the client detail title switcher popover so suggestion rows show readable
client names instead of collapsing to a few characters plus an ellipsis.

- Widened the popover from 320px to 420px while keeping the viewport max-width
  guard for small screens.
- Overrode the default `CommandItem` grid from icon/name/action columns to a
  content/action layout, so the name column receives the available row width.
- Removed single-line truncation from the client name and metadata; long names
  can wrap inside the suggestion row.

## Docs Alignment

No `DESIGN.md` update is needed. This keeps the existing title-position client
switcher interaction and fixes the option row layout within that component.

## Validation

- `pnpm exec vp check apps/app/src/features/clients/ClientTitleSwitcher.tsx docs/dev-log/2026-06-06-client-title-switcher-options.md`
- `git diff --check -- apps/app/src/features/clients/ClientTitleSwitcher.tsx docs/dev-log/2026-06-06-client-title-switcher-options.md`
- Browser: `http://localhost:5173/clients/meridian-multistate-corp-pro-plan-12000000-0000-4000-8000-000000000010`
  - Opened the title switcher popover after reloading the route.
  - Verified suggestion options use `grid-cols-[minmax(0,1fr)_auto]`.
  - Verified client-name spans are about 348px wide with normal wrapping and
    no ellipsis clipping.
