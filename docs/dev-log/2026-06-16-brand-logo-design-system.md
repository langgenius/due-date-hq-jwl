# Brand logo + design-system foundations (2026-06-16)

Designed the DueDateHQ brand mark and consolidated the brand/design-system
layer on top of the existing Dify-derived tokens. Iterated through several
logo directions with Yuqi; she ultimately supplied her own artwork, which is
the shipped mark.

## Logo — the "stacked bars" mark
- Final mark is Yuqi's supplied SVG: four rounded horizontal bars, the third
  indented — an abstract timeline/schedule motif. (Earlier explorations —
  "ahead-of-the-line", a serif "d." monogram, and a "Radar D" — were rejected.)
- `components/primitives/brand-mark.tsx` (`BrandMark`): app-icon form = ivory
  bars on a navy rounded square; the supplied 214×168 artwork scaled+centered.
  `frame={false}` renders just the navy bars (no square) for `/splash`.
- Replaced the placeholder bold "D" everywhere: `AuthBrandAnchor` (now with
  `tagline?` / `frame?` / `markClassName?` props) drives login (2 lockups),
  splash (frameless, smaller mark), and onboarding/2FA/accept-invite via
  `CenteredAuthScreen`. `_entry-layout` wordmark → serif.
- Regenerated the favicon (`apps/app`, `apps/marketing`) and the shared
  assets (`packages/ui/.../assets/brand/{brand-mark,brand-favicon,
  brand-favicon-dark}.svg`) — were the old ledger-D — plus that dir's README.

## Tokens
- `--font-serif` (system serif: New York / Georgia) for the wordmark only;
  no hosted webfont, consistent with the system-first `--font-sans` posture.
- Brand identity tokens `--color-brand-{ink,ink-deep,ivory,signal,gold}`
  (theme-invariant; consumed by `BrandMark` via `fill-*` with hex fallback).
  Note Tailwind v4 tree-shakes unused `@theme` tokens — keep a consumer.

## Color — two-tier accent
- Retuned the product accent off Dify blue (`#155aef`): the whole `primary`
  ramp recomputed to a warm navy-indigo (`600 #2E368C`, hover `700 #222A6C`),
  and the hardcoded `rgb(21 90 239 / N)` accent washes repointed in
  semantic-light + semantic-dark. (Sage green `#566E4C` was tried at Yuqi's
  request, then discarded — green-on-green collision with the success state.)
- New **highlight** tier `--color-brand-highlight #14C5F6` (+ `-ink #066C98`
  for legible text, `-soft #E3F6FD` wash) — the louder accent, by exception.
  Applied to every unread/unseen dot (notifications bell, alert rail, pulse
  rows, notifications page) and the `InfoBanner` hint strip. Focus rings stay
  navy; highlight is applied deliberately per-screen, not blanket.

## Docs
- `docs/brand/` — brand book + standalone mark/lockup/favicon SVGs, grounded
  in the real tokens (two-layer color model, type scale, radius, elevation,
  voice, primitive vocabulary).

## Scope note
A parallel session was concurrently editing the clients/alerts detail surfaces
(`DeadlineNavigatorRail`, `AlertDetailDrawer`, `ObligationQueueDetailDrawer`,
client detail files, i18n catalogs). Those changes are deliberately NOT in this
commit — staged only the brand/design-system files.

Verified live across login, splash, /alerts, /deadlines; tokens resolve; no
console errors.
