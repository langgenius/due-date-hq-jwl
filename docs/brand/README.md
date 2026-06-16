# DueDateHQ — brand & logo

Brand identity for DueDateHQ, a deadline/obligation command center for CPA firms.
Open the `.svg` files in a browser (or drop into Figma/Pencil) to view.

**Full design system → [brand-book.md](brand-book.md)** — logo, the two-layer color
model (brand identity vs Dify-derived product UI), typography, space/radius/elevation,
voice, and the primitive vocabulary, all grounded in the real tokens.

**Brand tokens (code):** `--color-brand-{ink,ink-deep,ivory,signal,gold}` in
`packages/ui/src/styles/tokens/primitives.css` · serif `--font-serif`.

## Files
- `duedatehq-mark.svg` — the mark, app-icon form (navy square, 64×64)
- `duedatehq-lockup.svg` — primary horizontal lockup (mark + wordmark + tagline)
- `duedatehq-favicon.svg` — favicon, optically tuned for 16–32px

Live in the app:
- `apps/app/src/components/primitives/brand-mark.tsx` — the `BrandMark` component
- `apps/app/public/favicon.svg` — shipped favicon
- `AuthBrandAnchor` in `apps/app/src/features/auth/auth-chrome.tsx` — the lockup

## Direction — "stacked bars"
Supplied by Yuqi (2026-06-16), replacing the earlier Radar D. Four rounded horizontal
bars, the third indented — an abstract timeline / schedule motif, fitting a deadlines
product:

- **Four stacked bars** = rows on a timeline / agenda.
- **The indented third bar** = the break in the stack that gives the mark its tension.
- App-icon form: ivory bars on a navy rounded square.
- **HQ** stays in the wordmark as a quiet sans tag — the command center, not the mark.

Wordmark is set in the brand serif (`DueDate`) with `HQ` as a small, de-emphasized sans
tag: "DueDate, the HQ" rather than one undifferentiated word. Serif = trust; the sans tag
signals software.

## Tokens
- Ink / navy: `#0A2540` (matches the app `theme-color`)
- Ivory (bars on navy): `#F3EEE6`
- HQ tag + tagline ink: `#5B6B7D`
- Paper (presentation tiles only): `#F6F3EF`
- The mark is navy + ivory only (no accent in the logo). The cyan tokens
  `--color-brand-signal` `#35D5FF` and highlight `--color-brand-highlight` `#14C5F6` live
  elsewhere in the system, not in the mark.

## Type
System-first, no hosted webfont — consistent with the app's `--font-sans` posture.
- Wordmark serif: `--font-serif` token (New York on Apple, Georgia on Windows).
- `HQ` tag + tagline: `--font-sans`.

## Honest to the existing brand
Reuses the real navy and the *"for CPA firms"* tagline. The mark is Yuqi's supplied
stacked-bars artwork (214×168), scaled + centered into the navy app-icon square. No
invented strapline.
