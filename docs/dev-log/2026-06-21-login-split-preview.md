# /login — centered sign-in + product-preview panel, 2026-06-21

**Who/why:** Yuqi shared a reference sign-in (centered minimal form + a product
screenshot bleeding off the side) — "this is a good style." Restyled `/login`
toward it, then pushed the details further.

## Layout

Two-panel, full-bleed:

- **Sign-in (left):** centered, airy column — dark "D" mark, "Sign in to
  DueDateHQ", one-line subhead, **email-first** (`Send sign-in link`) then an
  `or continue with` divider and the Google SSO below; quiet centered
  reassurance + magic-link recovery + residency line. (Reference order: fields →
  primary → SSO.)
- **Preview (right):** a soft gradient panel (`background-subtle →
  background-default → accent-hover`) with an ambient accent glow, a one-line
  promise top-left, and a **DueDateHQ "Deadlines" product window that bleeds off
  the right + bottom edge** — full app chrome: a left sidebar (firm switcher +
  `PRO`, search, nav with counts, active Deadlines, a dark "Busy-season ready"
  promo card) beside the deadlines list (Form / Client / Status / Due).

## Adapted, not copied

All copy is in our own voice (not the reference's wording). Kept **passwordless**
(no password field) and **Google** SSO (no Apple). Microsoft, when enabled,
renders as a second side-by-side SSO button. The preview is a **static marketing
mock** — illustrative sample deadlines on a logged-out surface, not live data
(no fiction-on-canvas concern).

## Auth wiring unchanged

Google redirect + One Tap, email-OTP send/verify/deep-link, redirect guards,
analytics events — all carried over verbatim. Standalone route (no EntryShell).

## Notes

- Sizing is token-driven (no per-element font patches) after the earlier
  type-scale work; below `lg` the preview hides and the sign-in column goes
  full-width.
- Orphaned imports removed (`AuthBrandAnchor`, `Fragment`, `ComponentType`).
- Observed while verifying: the primary button renders darker than the old
  accent-blue — that's a primary-button **token** change from a concurrent
  commit, not this edit. Flagged to Yuqi; left as-is for now.

## Verified

Rendered at 1512×861 signed-out: centered sign-in + product window with sidebar,
gradient + glow, bleeding off the edge. `login.tsx` typechecks clean; formatted.
