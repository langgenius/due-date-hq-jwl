# Login lockup — framed tile + logotype (option A)

**Date:** 2026-06-26

The bare-bars lockup on the auth surfaces read as a hamburger/menu icon, and at small
sizes the tilted bar looked like a misaligned bar. Reverted the lockup to the framed
app-icon form: navy tile (ivory bars) + the "DueDateHQ" logotype. The tile gives the mark
identity and makes the tilt read as intentional. (Yuqi picked option A from a rendered
comparison.)

## Changes

- `components/primitives/brand-wordmark.tsx` — extracted the nine letterforms into a shared
  `LETTER_PATHS` const; added **`BrandLogotype`** (letters only, `currentColor`); `BrandWordmark`
  (the all-in-one bars+letters lockup) now reuses the same paths.
- `features/auth/auth-chrome.tsx` — `AuthBrandAnchor` now composes `<BrandMark frame>` (size-10
  navy tile) + `<BrandLogotype h-5>` instead of the bare `BrandWordmark`. Covers login / splash /
  2FA / accept-invite / error. `frame`/`markClassName` props kept but deprecated/ignored.
- `routes/_entry-layout.tsx` — shell header switched to the same framed `BrandMark` +
  `BrandLogotype` (logotype keeps `dark:text-brand-ivory`).

## Verify

`tsgo` app clean; `vp run @duedatehq/app#build` clean; `vp fmt --check` clean. Live `/login`
confirmed: framed navy tile + "DueDateHQ" logotype (`framedTile` + `logotype` both present),
old bare-bars gone.

## Note

Marketing nav/footer still inline the bare-bars + letters (its own `--m-*` SVGs, not the React
components) — a framed tile there needs handling for the nav-on-dark band (a navy tile on a
dark nav is low-contrast). Flagged as a follow-up.
