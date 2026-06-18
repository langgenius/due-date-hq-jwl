# Pass-2 design-call batch

_2026-06-18_

Six design decisions Yuqi steered (from the
[pass-2 audit](../Design/full-app-audit-2026-06-18-pass2.md) backlog). Each was
a fork I couldn't infer, so each was put to her before building.

## 1. `review` color → violet, promoted to a real token (her call: violet)

The "review / pending" signal rendered in TWO hues: the `--status-review` token
(navy, `primary-600`) used by rules-console / generation-preview /
SurfaceSummaryStrip, and raw `violet-*` palette consts in `rules.library`.
Yuqi chose **violet** as canonical.

- Remapped `--status-review` light `primary-600`→`violet-600`, dark
  `primary-400`→`violet-400` (semantic-light/dark.css). This alone converts all
  four token consumers from navy to violet — they already bind the token.
- Added the missing scale members `--status-review-tint` (violet-100 /
  dark violet@14%) + `--status-review-text` (violet-700 / dark violet-400),
  re-exported in preset.css.
- `rules.library` `REVIEW_*_CLS` consts moved off the raw `violet-700/100/600`
  palette onto `text-status-review-text` / `bg-status-review-tint` /
  `bg-status-review`. Kills the last raw-violet reach for review.

NOT touched: the Badge `info` dot (`bg-violet-500`). Its own comment scopes it to
_waiting-on-client_ ("we're paused, waiting on someone else"), a different state
from review — folding it into `--status-review` would conflate two states. Left
as a separate follow-up if we want a `waiting-on-client` token.

## 2. Page-top rhythm → `pt-8 pb-12` (her call: keep pass-1 value)

pass-1 shipped `pt-8 pb-12`; `page-family-canonical.md` still said the tighter
`pt-6 md:pt-8 / pb-4 md:pb-6`. Reconciled UP to the shipped value: calendar,
notifications, reminders → `px-4 pt-8 pb-12 md:px-6`; members + practice (4
wrappers) `py-6` → `pt-8 pb-12`. Doc §2 updated to match.

## 3. Editable control height → `h-9` (her call: default all)

Combobox + IsoDatePicker triggers were `h-8` (32px) while Input + Select are
`h-9` (36px), so adjacent fields misaligned by 4px. Both raised to `h-9`.

## 4. Auth H1 size → canon `text-[28px] sm:text-[30px]`

`two-factor` + `accept-invite` were `text-[32px]`; login/onboarding are `28px`.
Aligned the two outliers (+ `leading-[1.15]`).

## 5. Table overflow → horizontal scroll

`/clients` ClientFactsWorkspace + `/members` (both tables) had `table-fixed`
columns wider than their `overflow-hidden` card → the Actions kebab clipped
(at all widths on /members). Wrapped each in `overflow-x-auto` inside the card.

## 6. /today Daily Brief distill → drop Alerts + Overdue pills (her call: remove)

Those two pills duplicated the Needs-attention section directly above and the
Priorities overdue bucket directly below — same counts, same destinations,
within ~150px. Removed both (+ the alerts-cache query they needed). The
Waiting-on-client pill stays (no twin elsewhere on /today). Firm-line comments
updated (scattered overdue is now owned by the Priorities table, not the pills).

## Verification

- `tsgo --noEmit` 0; `vp check` clean (warnings pre-existing baseline); 544 app
  tests pass; `i18n:extract` idempotent (removed 14 obsolete pill strings,
  en+zh); `compile --strict` ok; production build green (status-review-tint /
  -text utilities generated — tree-shake confirmed).

## Still open — DS-architecture design calls (the heavier ones)

severity-chip primitive extraction, StatBand color budget, form-control
_radius_ cohesion, FieldLabel name collision (rename vs alias), dup Sort-by home,
upgrade-cta + splash dark theming.
