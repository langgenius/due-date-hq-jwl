# Auth/splash ground: warm ivory → cold light gray

_2026-06-18_

Yuqi's call: the auth ground read too warm. Reverted the ivory ground introduced
in [brand-color-refinements](2026-06-16-brand-color-refinements.md) (`bg-brand-ivory`,
`#f3eee6`) to a cold light gray.

## Change

`bg-brand-ivory` → `bg-background-subtle` (gray-100 `#f2f4f7`, cool/neutral) on the
three auth/splash page grounds:

- `routes/login.tsx`
- `features/auth/auth-chrome.tsx`
- `routes/splash.tsx`

Dark-mode variants left untouched (`dark:bg-bg-canvas` / `dark:bg-background-section`).
The white form card (`bg-background-default`) keeps the ground/card contrast — now
cool instead of warm.

Chose `background-subtle` (gray-100) over `background-section` (gray-50, lighter)
to preserve the visible ground the ivory gave; gray-50 would read near-white. NOT
`bg-canvas` — that resolves to `--background-body`, a _warm_ gray.

## Brand token

`--color-brand-ivory` (`#f3eee6`) is now **logo-mark-fill only** (the ivory bars on
the navy mark, via `fill-brand-ivory` in `brand-mark.tsx`) — no longer a page
ground. Updated the token comment + `brand-book.md` / `brand-book.zh.md`.

## Verification

- Live (`/login`): root ground computes `rgb(242, 244, 247)` = `#f2f4f7` (was the
  warm `rgb(243, 238, 230)`); white card contrast intact, no console errors.
- `tsgo --noEmit` → 0 errors; `vp fmt` clean on changed files.
