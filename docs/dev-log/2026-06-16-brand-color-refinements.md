# Brand color refinements — ivory ground, cyan New badge, honest docs (2026-06-16)

Follow-up to the brand/logo commit. An audit found two documented brand colors
barely (or not) used in the product; closed the gap between doc and reality.

## ivory → a real home
`--color-brand-ivory #F3EEE6` was logo-only. Deployed it as the auth / splash /
login background (light mode; `dark:` keeps the dark canvas). The navy bars mark
now sits on a warm cream brand ground — ivory is finally visible, product UI
untouched. Verified `rgb(243,238,230)` on `/accept-invite`.

## cyan New badge — the highlight's visible anchor
`--color-brand-highlight #14C5F6` lived only on 6–8px unread dots. Added a
`NewBadge` primitive (cyan fill + navy text) and wired it onto unread
notifications. Cyan stays scarce (a marker, not a tier) but now has a legible
home; the notifications-page leading dot was dropped in favor of the badge.

## Dropped the dead second cyan
`--color-brand-signal #35D5FF` had zero consumers after the logo lost its dot.
Removed it — one cyan only (`#14C5F6`). grep confirms no dangling refs.

## Docs made honest (EN + ZH brand book)
- cyan reframed as a "scarce marker, not a co-equal accent tier"
- ivory's role written as the auth ground (not a product-UI color)
- removed `signal` from the §0 / §2.1 tables; fixed §2.4 status "review"
  `#155AEF -> #2E368C` (follows primary-600)
- §2.2 contrast rule rewritten: text on a cyan fill = navy `#0A2540`
  (~7.6 : 1, AAA) — never white (~2 : 1, fails); cyan-text-on-white uses
  `highlight-ink`; never `highlight-ink` on a cyan fill (~2.9 : 1, mushy).

Verified live: ivory ground on `/accept-invite`; cyan `New` badge
`rgb(20,197,246)` + navy text on `/notifications`. No console errors.

Parallel-session files (obligations refactor, etc.) deliberately excluded.
