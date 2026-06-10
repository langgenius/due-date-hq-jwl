# /today — proper Review button + lighter row hover (2026-06-10)

Two polish fixes on the "Actions this week" stream
(`apps/app/src/features/dashboard/actions-list.tsx`).

## 1. Review CTA → a real button

The per-row Review action was a `variant="link"` (bare blue text). Swapped to
`variant="primary"` (size `xs`) — filled accent button (blue fill `rgb(21 90
239)`, white text). Reads as a proper primary CTA instead of a link. The a11y
model is unchanged: it stays `aria-hidden` / `tabIndex={-1}` (the whole row is
the focusable click target; the button is a redundant pointer affordance that
fades in on hover).

## 2. Row hover — lighter

Row hover was `bg-background-subtle` (gray-100), which read heavy. Lightened to
`bg-background-default-hover` (gray-50) on both `hover:` and `focus-visible:`.

**Token check (per request "use the assigned colour, else make a new one"):**
there's already an assigned lighter-hover token — `--background-default-hover`
(= `gray-50`, `rgb(249 250 251)`), already `@theme`-exported in `preset.css` as
`--color-background-default-hover`. Reused it rather than minting a third gray-50
alias (`background-section` + `background-default-hover` already point there). No
new variable. The canonical `<TableRow>` hover (`state-base-hover`) is
semi-transparent and was deliberately NOT used here: this row masks the due date
behind the Review CTA with a left-fading gradient, which needs an _opaque_ tone —
so the gradient `from-background-subtle` was moved to `from-background-default-hover`
to track the new hover.

Verified live on /today: Review renders as a white bordered button
(bg `#ffffff`, border `rgba(16,24,40,.14)`, text `#354052`); row hover resolves
to gray-50; mask still fades the due date cleanly. `tsgo` clean; no console errors.
